import { Controller, Post, Body, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiAssistantService } from './ai-assistant.service';

@ApiTags('ai-assistant')
@ApiBearerAuth()
@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly service: AiAssistantService) {}

  @Post('chat')
  chat(@Request() req: any, @Body() body: { message: string; context?: any }) {
    return this.service.chat(req.user.id, body.message, body.context);
  }
}
