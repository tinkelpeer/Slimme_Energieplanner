// backend/src/simulate/simulate.service.ts
import { Injectable } from '@nestjs/common';
import { SimulateDto } from './dto/simulate.dto';

@Injectable()
export class SimulateService {
  /**
   * Deterministische pseudo-willekeurige getallengenerator (mulberry32)
   * Retourneert een functie die een herhaalbare reeks 0 ≤ x < 1 oplevert
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
   * Hoofd-API voor simulatie
   * Verwerkt invoer, voert berekeningen uit en retourneert resultaten per interval
   */
  simulate(dto: SimulateDto) {
    // Stap 1: dagprijzen inlezen en valideren
    const prices = this.parseCsv(dto.dayAheadCsv);
    if (prices.length < 2) {
      throw new Error('CSV moet minstens twee regels met data bevatten');
    }

    // Stap 2: optioneel PV-profiel inlezen
    let pvData: { timestamp: string; price: number }[] = [];
    if (dto.pvProfileCsv) {
      pvData = this.parseCsv(dto.pvProfileCsv);
    }

    // Stap 3: bepaal tijdsinterval Δt (in minuten)
    const priceDt = Math.abs(
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

    // Stap 4: kies kleinste Δt voor uniforme grid
    const dtMin = Math.min(priceDt, pvDt);
    const kWhPerKw = dtMin / 60;

    // Stap 5: maak mappen van tijdstip naar waarde
    const priceMap = new Map<number, number>();
    prices.forEach(p =>
      priceMap.set(this.minutesSinceMidnight(p.timestamp), p.price),
    );
    const pvMap = new Map<number, number>();
    pvData.forEach(p =>
      pvMap.set(this.minutesSinceMidnight(p.timestamp), p.price),
    );

    // Stap 6: bouw uniforme arrays voor 24 uur
    const intervalsPerDay = Math.floor((24 * 60) / dtMin);
    const unifiedPrices: number[] = new Array(intervalsPerDay);
    const pvProduction: number[] = new Array(intervalsPerDay);
    let lastPrice = prices[0].price;
    for (let i = 0; i < intervalsPerDay; i++) {
      const t = i * dtMin;
      if (priceMap.has(t)) lastPrice = priceMap.get(t)!;
      unifiedPrices[i] = lastPrice;
      pvProduction[i] = pvMap.get(t) ?? 0;
    }

    // Willekeurig en gepland verbruik berekenen op uniforme grid
    const rng = this.mulberry32(42);
    const random: number[] = Array(intervalsPerDay)
      .fill(0)
      .map(() => (0.1 + rng() * 0.3) * (dtMin / 60));
    const planned: number[] = Array(intervalsPerDay).fill(0);
    dto.actions.forEach(a => {
      const [h, m] = a.startTime.split(':').map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + a.duration;
      for (let idx = 0; idx < intervalsPerDay; idx++) {
        const intStart = idx * dtMin;
        const intEnd = intStart + dtMin;
        const overlap = Math.max(
          0,
          Math.min(endMin, intEnd) - Math.max(startMin, intStart),
        );
        if (overlap > 0) {
          planned[idx] += a.power * (overlap / 60);
        }
      }
    });

    // Batterijinstellingen en beperkingen inladen
    const cap = dto.capacity;
    let soc = (dto.startSoc / 100) * cap;
    const maxPerInterval = dto.powerLimit * kWhPerKw;
    const gridLimitKWh = dto.gridLimit * kWhPerKw;
    const tradeMin = 0;
    const tradeMax = 0.8 * cap;
    const meanPrice =
      unifiedPrices.reduce((s, p) => s + p, 0) / unifiedPrices.length;

    // Cumulatieve variabelen voor statistieken
    let totalGridEnergy = 0;
    let totalCost = 0;
    let pvSelfConsumed = 0;
    let pvExported = 0;
    let exportRevenue = 0;
    let socSum = 0;

    // Per-interval simulatie
    const intervals = unifiedPrices.map((price, idx) => {
      // Bereken totale vraag: gepland + willekeurig
      const grossLoad = planned[idx] + random[idx];
      const production = pvProduction[idx] ?? 0;

      // Tellers resetten per interval
      let thisIntervalPvSelfConsumed = 0;
      let thisIntervalPvExported = 0;

      // 1) Verwerk overtollige PV: laad batterij, exporteer rest
      let netLoad = grossLoad - production;
      let battery = 0;
      if (netLoad < 0) {
        const surplus = -netLoad;
        const chargeFromPV = Math.min(surplus, maxPerInterval, cap - soc);
        soc += chargeFromPV;
        battery -= chargeFromPV;
        thisIntervalPvSelfConsumed = chargeFromPV;
        pvSelfConsumed += chargeFromPV;
        const leftover = surplus - chargeFromPV;
        thisIntervalPvExported = leftover;
        pvExported += leftover;
        exportRevenue += leftover * price;
        netLoad = 0;
      }

      // 2) Piekafvlakking: gebruik batterij om netbelasting te beperken
      const socBefore = soc;
      if (netLoad > gridLimitKWh && soc > 0) {
        const need = Math.min(
          netLoad - gridLimitKWh,
          maxPerInterval,
          soc,
        );
        battery += need;
        soc -= need;
        netLoad -= need;
      }

      // 3) Arbitrage: laad goedkoop, ontlaad duur
      if (price < meanPrice && soc < tradeMax) {
        const headroom = Math.max(gridLimitKWh - netLoad, 0);
        const room = Math.min(
          tradeMax - soc,
          maxPerInterval,
          gridLimitKWh - netLoad,
        );
        battery -= room;
        soc += room;
        netLoad += room;
      } else if (price > meanPrice && soc > tradeMin) {
        const avail = Math.min(soc - tradeMin, maxPerInterval);
        battery += avail;
        soc -= avail;
        netLoad -= avail;
      }

      // 4) Extra piekbeperking indien nodig
      if (netLoad > gridLimitKWh && soc > 0) {
        const extra = Math.min(
          netLoad - gridLimitKWh,
          maxPerInterval,
          soc,
        );
        battery += extra;
        soc -= extra;
        netLoad -= extra;
      }

      // Bereken kosten en sla SoC op
      socSum += (socBefore + soc) / 2;
      const gridEnergy = netLoad;
      const cost = gridEnergy * price;
      totalGridEnergy += gridEnergy;
      totalCost += cost;

      // Retourneer intervalresultaat
      return {
        timestamp: this.formatTimestamp(idx, dtMin),
        price,
        pvProduction: production,
        plannedUsage: planned[idx],
        randomUsage: random[idx],
        netLoad,
        batteryAction: battery,
        soc: Number(((soc / cap) * 100).toFixed(1)),
        gridEnergy,
        cost,
        pvSelfConsumed: Number(thisIntervalPvSelfConsumed.toFixed(3)),
        pvExported: Number(thisIntervalPvExported.toFixed(3)),
      };
    });

    // Gemiddelde SoC in %
    const avgSoc = unifiedPrices.length
      ? Number(((socSum / unifiedPrices.length) / cap * 100).toFixed(1))
      : 0;

    // Eindresultaat teruggeven
    return {
      netUsage: Number(totalGridEnergy.toFixed(3)),
      netCost: Number(totalCost.toFixed(2)),
      avgSoc,
      pvSelfConsumed: Number(pvSelfConsumed.toFixed(3)),
      pvExported: Number(pvExported.toFixed(3)),
      exportRevenue: Number(exportRevenue.toFixed(2)),
      intervals,
    };
  }

  /**
   * Parseer CSV-tekst (tijdstip, prijs of productie)
   */
  private parseCsv(csv: string) {
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const first = lines[0].split(/[,;]/).map(f => f.trim().toLowerCase());
    const hasHeader =
      (first[0] === 'tijdstip' || first[0] === 'time') &&
      ['prijs', 'price', 'productie', 'production'].includes(first[1]);
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map(line => {
      const [tsRaw, valRaw] = line.split(/[,;]/);
      return {
        timestamp: tsRaw.trim(),
        price: parseFloat(valRaw.trim().replace(',', '.')),
      };
    });
  }

  /**
   * Bereken minuten sinds middernacht uit “HH:MM” of ISO-achtige string
   */
  private minutesSinceMidnight(ts: string): number {
    const timePart = ts.split(/[T ]/).pop()!;
    const [h, m] = timePart.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Formatteer tijdstip voor uniforme grid terug naar “HH:MM”
   */
  private formatTimestamp(idx: number, dtMin: number): string {
    const totalMin = idx * dtMin;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
