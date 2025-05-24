import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ActionDto {
  @IsString()
  startTime!: string;    // HH:MM

  @IsNumber()
  duration!: number;     // minuten

  @IsNumber()
  power!: number;        // kW
}

export class SimulateDto {
  @IsNumber()
  capacity!: number;     // kWh

  @IsNumber()
  startSoc!: number;     // % (0-100)

  @IsNumber()
  powerLimit!: number;   // kW

  @IsNumber()
  gridLimit!: number;    // kW

  @IsString()
  dayAheadCsv!: string;  // ruwe CSV-tekst

  @IsOptional()
  @IsString()
  pvProfileCsv?: string; // ruwe CSV-tekst, optioneel

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions!: ActionDto[];
}
