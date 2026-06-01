import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'smartwallet-api',
    };
  }

  @Get('db')
  async getDatabaseHealth() {
    const result = await this.dataSource.query('select now() as current_time');

    return {
      status: 'ok',
      database: 'connected',
      currentTime: result[0].current_time,
    };
  }
}