import { Module } from '@nestjs/common';
import { SimulateService } from './simulate.service';
import { SimulateController } from './simulate.controller';

@Module({
  controllers: [SimulateController],
  providers: [SimulateService],
})
export class SimulateModule {}
