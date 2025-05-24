import { Body, Controller, Post } from '@nestjs/common';
import { SimulateService } from './simulate.service';
import { SimulateDto } from './dto/simulate.dto';

@Controller('simulate')
export class SimulateController {
  constructor(private readonly simulateService: SimulateService) {}

  @Post()
  simulate(@Body() dto: SimulateDto) {
    return this.simulateService.simulate(dto);
  }
}

