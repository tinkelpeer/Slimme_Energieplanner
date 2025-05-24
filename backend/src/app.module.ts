import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SimulateModule } from './simulate/simulate.module';

@Module({
  imports: [SimulateModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
