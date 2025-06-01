import { Injectable } from '@nestjs/common';
import { SimulateDto } from './dto/simulate.dto';

@Injectable()
export class SimulateService {
  /**
   * Mulberry32–pseudo‐random generator (deterministisch).
   */
  private mulberry32(seed: number) {
    return () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Hoofd‐API voor de simulatie.
   */
  simulate(dto: SimulateDto) {
    // 1) Parseer day-ahead CSV
    const prices = this.parseCsv(dto.dayAheadCsv);
    if (prices.length < 2) {
      throw new Error('CSV moet minstens twee regels met data bevatten');
    }

    // 2) Parseer optioneel PV-profiel
    let pvData: Array<{ timestamp: string; price: number }> = [];
    if (dto.pvProfileCsv) {
      pvData = this.parseCsv(dto.pvProfileCsv);
    }

    // 3) Bepaal Δt uit timestamps (prijs-CSV & PV-CSV)
    const priceDt =
      Math.abs(
        this.minutesSinceMidnight(prices[1].timestamp) -
          this.minutesSinceMidnight(prices[0].timestamp),
      ) || 60;
    const pvDt =
      pvData.length > 1
        ? Math.abs(
            this.minutesSinceMidnight(pvData[1].timestamp) -
              this.minutesSinceMidnight(pvData[0].timestamp),
          )
        : priceDt;

    // Controle: 24 u exact deelbaar door elk interval
    if ((24 * 60) % priceDt !== 0 || (24 * 60) % pvDt !== 0) {
      throw new Error('De CSV-timestamps leiden niet tot een exact 24-uurs raster');
    }

    const dtMin = Math.min(priceDt, pvDt);
    const intervalsPerDay = Math.floor((24 * 60) / dtMin);
    const kWhPerKw = dtMin / 60; // omzet kW → kWh per interval

    // 4) Bouw uniforme arrays “unifiedPrices” en “pvProduction”
    const priceMap = new Map<number, number>();
    prices.forEach((p) =>
      priceMap.set(this.minutesSinceMidnight(p.timestamp), p.price),
    );
    const pvMap = new Map<number, number>();
    pvData.forEach((p) =>
      pvMap.set(this.minutesSinceMidnight(p.timestamp), p.price),
    );

    const unifiedPrices: number[] = new Array(intervalsPerDay);
    const pvProduction: number[] = new Array(intervalsPerDay);
    let lastPrice = prices[0].price;
    let lastPv = pvData.length ? pvData[0].price : 0;
    for (let i = 0; i < intervalsPerDay; i++) {
      const t = i * dtMin;
      if (priceMap.has(t)) {
        lastPrice = priceMap.get(t)!;
      }
      if (pvMap.has(t)) {
        lastPv = pvMap.get(t)!;
      }
      unifiedPrices[i] = lastPrice;
      pvProduction[i] = lastPv;
    }

    // 5) Willekeurig + gepland verbruik op uniforme grid
    const rng = this.mulberry32(42);
    const randomUsage: number[] = Array(intervalsPerDay)
      .fill(0)
      .map(() => (0.1 + rng() * 0.3) * (dtMin / 60));

    const plannedUsage: number[] = Array(intervalsPerDay).fill(0);
    dto.actions.forEach((act) => {
      const [h, m] = act.startTime.split(':').map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + act.duration;
      for (let idx = 0; idx < intervalsPerDay; idx++) {
        const intStart = idx * dtMin;
        const intEnd = intStart + dtMin;
        const overlap = Math.max(
          0,
          Math.min(endMin, intEnd) - Math.max(startMin, intStart),
        );
        if (overlap > 0) {
          // act.power (kW) → kWh voor de overlap
          plannedUsage[idx] += act.power * (overlap / 60);
        }
      }
    });

    // 6) Netto-load vóór handel: (planned + random) − PV
    const netLoadNoTrade: number[] = new Array(intervalsPerDay);
    for (let i = 0; i < intervalsPerDay; i++) {
      const gross = plannedUsage[i] + randomUsage[i];
      const pv = pvProduction[i] || 0;
      netLoadNoTrade[i] = gross - pv;
    }

    // 7) Batterij‐parameters en randvoorwaarden
    const cap = dto.capacity; // in kWh
    const startSocKwh = (dto.startSoc / 100) * cap;
    const maxPerInterval = dto.powerLimit * kWhPerKw; // kW × (dtMin/60) = kWh per interval
    const gridLimitKwh = dto.gridLimit * kWhPerKw;   // idem voor netaansluiting
    const tradeMin = 0;             // mag niet onder 0 kWh
    const tradeMax = 0.8 * cap;     // maximaal 80% van capaciteit voor handel

    // 8) DP‐voorbereiding: discretiseer SoC in stappen van 0.01 kWh
    const socStep = 0.01;
    const numStates = Math.floor(cap / socStep) + 1; // vb cap=10 → indices 0…1000

    // dp[i][j] = maximale resterende winst vanaf interval i als SoC = j×0.01 kWh
    const dp: number[][] = [];
    for (let i = 0; i <= intervalsPerDay; i++) {
      dp[i] = new Array(numStates).fill(-Infinity);
    }
    // Basis: ná het laatste interval is er geen winst meer
    for (let j = 0; j < numStates; j++) {
      dp[intervalsPerDay][j] = 0;
    }

    // 9) DP vullen: van i = intervalsPerDay−1 terug naar 0
    //   Eerst eigen‐gebruik (PV → load, batterij → load, PV → batterij),
    //   dan δ_trade (laden/ontladen uit/naar net)
    for (let i = intervalsPerDay - 1; i >= 0; i--) {
      const price = unifiedPrices[i];
      const gross = plannedUsage[i] + randomUsage[i];
      const pv = pvProduction[i] || 0;

      for (let j = 0; j < numStates; j++) {
        const socNow = j * socStep;

        // — Stap 1: PV → load
        const pvToLoad = Math.min(pv, gross);
        const remLoadAfterPv = gross - pvToLoad; // >0 = nog load, <0 = PV‐overschot

        // — Stap 2: “Eigen‐use discharge” (batterij levert woning)
        let dischargeEigen = 0;
        if (remLoadAfterPv > 0) {
          dischargeEigen = Math.min(remLoadAfterPv, socNow, maxPerInterval);
        }
        const socAfterDischarge = socNow - dischargeEigen;
        const remLoadAfterBatt = remLoadAfterPv - dischargeEigen; // >0 = nog load, <0 = PV‐overschot

        // — Stap 3: “Eigen‐use chargeFromPV” (rest‐PV → batterij)
        let chargeFromPv = 0;
        if (remLoadAfterBatt < 0) {
          const leftoverPv = -remLoadAfterBatt; // PV die niet naar load ging
          const freeCapAfterDischarge = cap - socAfterDischarge;
          chargeFromPv = Math.min(leftoverPv, freeCapAfterDischarge, maxPerInterval);
        }
        const socAfterEigenUse = socAfterDischarge + chargeFromPv;

        // — Stap 4: bepaal netflow na “eigen utilization”:
        //    Als remLoadAfterBatt > 0 → rest‐load komt van net
        //    Als remLoadAfterBatt < 0 → PV‐overschot (batterij is al geladen)
        let netAfterEigen: number;
        if (remLoadAfterBatt >= 0) {
          netAfterEigen = remLoadAfterBatt;
        } else {
          // PV‐overschot = |remLoadAfterBatt|; batterij ontving chargeFromPv
          // → wat écht naar net gaat is (|remLoadAfterBatt| − chargeFromPv)
          netAfterEigen = -(Math.abs(remLoadAfterBatt) - chargeFromPv);
        }

        // δ_trade‐lus: beslissing hoeveel te laden/ontladen ivm prijs
        // δ_trade > 0 = laden uit net; δ_trade < 0 = ontladen naar net
        let best = -Infinity;
        for (
          let deltaTrade = -maxPerInterval;
          deltaTrade <= maxPerInterval + 1e-9;
          deltaTrade += socStep
        ) {
          // 1) |δ_trade| ≤ maxPerInterval (sluit af door loop‐bounds)
          // 2) Nieuwe SoC na δ_trade mag niet < 0 en niet > cap
          const socCand = socAfterEigenUse + deltaTrade;
          if (socCand < -1e-9 || socCand > cap + 1e-9) continue;

          // 3) Laden uit net (δ_trade > 0) mag SoC ≤ tradeMax (80%)
          if (deltaTrade > 0 && socAfterEigenUse + deltaTrade > tradeMax + 1e-9) {
            continue;
          }

          // 4) Ontladen naar net (δ_trade < 0) mag niet uit bovenste 20%
          if (
            deltaTrade < 0 &&
            socAfterEigenUse > tradeMax + 1e-9 &&
            deltaTrade < tradeMax - socAfterEigenUse - 1e-9
          ) {
            continue;
          }

          // 5) Grid‐limiet: netAfterEigen + δ_trade ≤ gridLimitKwh
          const netCand = netAfterEigen + deltaTrade;
          if (netCand > gridLimitKwh + 1e-9) continue;

          // 6) “profitNow_trade” = −(netCand) × prijs
          const profitNowTrade = -netCand * price;

          // 7) Waarde in dp voor volgende interval
          const idxNext = Math.round(socCand / socStep);
          if (idxNext < 0 || idxNext >= numStates) continue;

          const candTotal = profitNowTrade + dp[i + 1][idxNext];
          if (candTotal > best) {
            best = candTotal;
          }
        } // einde δ_trade‐lus

        dp[i][j] = best;
      }
    }

    // 10) Reconstructie: bepaal optimale δ_trade per interval
    const optimalDeltaTrade: number[] = new Array(intervalsPerDay).fill(0);
    {
      let socIter = startSocKwh;

      for (let i = 0; i < intervalsPerDay; i++) {
        const price = unifiedPrices[i];
        const gross = plannedUsage[i] + randomUsage[i];
        const pv = pvProduction[i] || 0;

        // Herbereken eigen‐gebruik stappen
        const pvToLoad = Math.min(pv, gross);
        const remLoadAfterPv = gross - pvToLoad;

        let dischargeEigen = 0;
        if (remLoadAfterPv > 0) {
          dischargeEigen = Math.min(remLoadAfterPv, socIter, maxPerInterval);
        }
        const socAfterDischarge = socIter - dischargeEigen;
        const remLoadAfterBatt = remLoadAfterPv - dischargeEigen;

        let chargeFromPv = 0;
        if (remLoadAfterBatt < 0) {
          const leftoverPv = -remLoadAfterBatt;
          const freeCapAfterDischarge = cap - socAfterDischarge;
          chargeFromPv = Math.min(leftoverPv, freeCapAfterDischarge, maxPerInterval);
        }
        const socAfterEigenUse = socAfterDischarge + chargeFromPv;

        let netAfterEigen: number;
        if (remLoadAfterBatt >= 0) {
          netAfterEigen = remLoadAfterBatt;
        } else {
          netAfterEigen = -(Math.abs(remLoadAfterBatt) - chargeFromPv);
        }

        // Kies optimale δ_trade uit dp‐waarden
        let bestVal = -Infinity;
        let bestDelta = 0;
        for (
          let deltaTrade = -maxPerInterval;
          deltaTrade <= maxPerInterval + 1e-9;
          deltaTrade += socStep
        ) {
          const socCand = socAfterEigenUse + deltaTrade;
          if (socCand < -1e-9 || socCand > cap + 1e-9) continue;
          if (deltaTrade > 0 && socAfterEigenUse + deltaTrade > tradeMax + 1e-9) {
            continue;
          }
          if (
            deltaTrade < 0 &&
            socAfterEigenUse > tradeMax + 1e-9 &&
            deltaTrade < tradeMax - socAfterEigenUse - 1e-9
          ) {
            continue;
          }
          const netCand = netAfterEigen + deltaTrade;
          if (netCand > gridLimitKwh + 1e-9) continue;

          const profitNowTrade = -netCand * price;
          const idxNext = Math.round(socCand / socStep);
          if (idxNext < 0 || idxNext >= numStates) continue;

          const cand = profitNowTrade + dp[i + 1][idxNext];
          if (cand > bestVal) {
            bestVal = cand;
            bestDelta = deltaTrade;
          }
        }

        optimalDeltaTrade[i] = bestDelta;
        socIter = socAfterEigenUse + bestDelta;
      }
    }

    // 11) Replay: per interval data opbouwen met gevonden δ_trade
    let soc = startSocKwh;
    let totalGridEnergy = 0; // kWh (wat we van het net hebben afgenomen)
    let totalCost = 0;       // € (netto: kosten minus opbrengsten)
    let pvSelfConsumed = 0;  // kWh
    let pvExported = 0;      // kWh (alleen PV-export)
    let batteryExported = 0; // kWh (alleen batterij‐export)
    let exportRevenue = 0;   // € uit PV‐verkoop (batterij‐verkoop zit in totalCost)

    const intervals = unifiedPrices.map((price, i) => {
      const gross = plannedUsage[i] + randomUsage[i];
      const pv = pvProduction[i] || 0;
      const deltaTrade = optimalDeltaTrade[i];

      // — Stap A1: PV → load
      const pvToLoad = Math.min(pv, gross);
      const remLoadAfterPv = gross - pvToLoad;

      // — Stap A2: Battery discharge voor eigen use
      let dischargeEigen = 0;
      if (remLoadAfterPv > 0) {
        dischargeEigen = Math.min(remLoadAfterPv, soc, maxPerInterval);
      }
      const socAfterDischarge = soc - dischargeEigen;
      const remLoadAfterBatt = remLoadAfterPv - dischargeEigen;

      // — Stap A3: PV → batterij (eigen use)
      let chargeFromPv = 0;
      if (remLoadAfterBatt < 0) {
        const leftoverPv = -remLoadAfterBatt;
        const freeCapAfterDischarge = cap - socAfterDischarge;
        chargeFromPv = Math.min(leftoverPv, freeCapAfterDischarge, maxPerInterval);
      }
      soc = socAfterDischarge + chargeFromPv;

      // — Stap B: Basale netflow na eigen use
      let netFlowAfterOwn: number;
      let pvExportNow = 0;
      if (remLoadAfterBatt >= 0) {
        netFlowAfterOwn = remLoadAfterBatt;
      } else {
        pvExportNow = Math.max(0, Math.abs(remLoadAfterBatt) - chargeFromPv);
        netFlowAfterOwn = -pvExportNow;
      }

      // — Stap C: δ_trade (laden of ontladen uit/naar net)
      if (deltaTrade > 0) {
        // Laden uit net
        soc += deltaTrade; // DP garandeert ≤ tradeMax én ≤ cap
      } else if (deltaTrade < 0) {
        // Ontladen naar net
        soc += deltaTrade; // deltaTrade negatief → soc daalt
        batteryExported += -deltaTrade;
      }

      // — Stap D: Totale netflow dit interval:
      //   netFlow = rest‐load van net + δ_trade  (negatief = we verkopen)
      const netFlow = netFlowAfterOwn + deltaTrade;

      // — Stap E: Kosten/opbrengsten
      const costThis = netFlow * price;
      totalCost += costThis;
      if (netFlow > 0) {
        totalGridEnergy += netFlow;
      } else {
        // Bij negatieve netFlow: verkoop aan net. Bij PV‐export nemen we pvExportNow, bij batterij‐export batteryExported.
        // We tellen PV‐export apart: alleen PV→net staat in pvExported, batterij→net in batteryExported.
        exportRevenue += pvExportNow * price;
      }

      // — Stap F: PV‐statistieken
      const pvSelfNow = pvToLoad + chargeFromPv;
      pvSelfConsumed += pvSelfNow;
      pvExported += pvExportNow;

      // — Stap G: CORRECTE batterijactie 
      //   > positief → batterij levert energie (discharge)
      //   > negatief → batterij neemt energie (charge)
      const battAction = dischargeEigen - chargeFromPv - deltaTrade;

      // — Stap H: Interval‐object invullen
      const socPct = Number(((soc / cap) * 100).toFixed(1));
      return {
        timestamp: this.formatTimestamp(i, dtMin),
        price,
        pvProduction: pv,
        plannedUsage: plannedUsage[i],
        randomUsage: randomUsage[i],
        netLoad: Number(netFlow.toFixed(3)),
        batteryAction: Number(battAction.toFixed(3)),
        soc: socPct,
        gridEnergy: Number((netFlow > 0 ? netFlow : 0).toFixed(3)),
        cost: Number(costThis.toFixed(3)),
        pvSelfConsumed: Number(pvSelfNow.toFixed(3)),
        pvExported: Number(pvExportNow.toFixed(3)),
      };
    });

    // 12) Gemiddelde SoC in %
    const avgSoc: number =
      intervalsPerDay > 0
        ? Number(
            (
              intervals
                .map((row) => (row.soc / 100) * cap) // in kWh
                .reduce((sum, kWh) => sum + kWh, 0) /
              intervalsPerDay /
              cap *
              100
            ).toFixed(1),
          )
        : 0;

    // 13) Eindresultaat retourneren
    return {
      netUsage: Number(totalGridEnergy.toFixed(3)),
      netCost: Number(totalCost.toFixed(2)),
      avgSoc,
      pvSelfConsumed: Number(pvSelfConsumed.toFixed(3)),
      pvExported: Number(pvExported.toFixed(3)),
      exportRevenue: Number(exportRevenue.toFixed(2)),
      batteryExported: Number(batteryExported.toFixed(3)),
      intervals,
    };
  }

  /**
   * Parseer CSV‐tekst (kolommen: tijdstip; prijs of productie).
   */
  private parseCsv(csv: string) {
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].split(/[,;]/).map((s) => s.trim().toLowerCase());
    const hasHeader =
      (header[0] === 'tijdstip' || header[0] === 'time') &&
      (header[1] === 'prijs' ||
        header[1] === 'price' ||
        header[1] === 'productie' ||
        header[1] === 'production');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map((ln) => {
      const [tsRaw, valRaw] = ln.split(/[,;]/);
      return {
        timestamp: tsRaw.trim(),
        price: parseFloat(valRaw.trim().replace(',', '.')),
      };
    });
  }

  /**
   * Converteer “HH:MM” of ISO-like naar minuten sinds middernacht.
   */
  private minutesSinceMidnight(ts: string): number {
    const tpart = ts.split(/[T ]/).pop()!;
    const [h, m] = tpart.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Formatteer de i‐de interval naar “HH:MM” (op basis van dtMin).
   */
  private formatTimestamp(idx: number, dtMin: number): string {
    const totalMin = idx * dtMin;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
