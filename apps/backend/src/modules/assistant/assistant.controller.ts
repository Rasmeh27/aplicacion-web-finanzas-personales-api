import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssistantService } from './assistant.service';
import { AssistantChatRequestDto } from './dto/assistant-chat-request.dto';
import { AssistantChatResponseDto } from './dto/assistant-chat-response.dto';
import { UpdateAssistantSessionDto } from './dto/update-assistant-session.dto';

@ApiTags('assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Enviar un mensaje al asistente de IA',
    description:
      'El frontend solo envía { message, session_id }. El backend resuelve ' +
      'user, plan y allowed_scopes desde el usuario autenticado, persiste el ' +
      'mensaje del usuario y la respuesta del asistente, y llama al AI Service.',
  })
  chat(
    @Request() req: any,
    @Body() dto: AssistantChatRequestDto,
  ): Promise<AssistantChatResponseDto> {
    return this.service.chat(this.getUserId(req), req.user?.email, dto);
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Listar las sesiones del usuario autenticado',
    description: 'Sesiones activas ordenadas por actividad reciente.',
  })
  listSessions(@Request() req: any) {
    return this.service.listSessions(this.getUserId(req));
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({
    summary: 'Leer los mensajes de una sesión propia',
  })
  getSessionMessages(
    @Request() req: any,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.service.getSessionMessages(this.getUserId(req), sessionId);
  }

  @Patch('sessions/:sessionId')
  @ApiOperation({
    summary: 'Actualizar una sesión propia (por ahora solo el título)',
  })
  updateSession(
    @Request() req: any,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateAssistantSessionDto,
  ) {
    return this.service.updateSession(this.getUserId(req), sessionId, dto);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({
    summary: 'Archivar una sesión propia (soft delete por estado)',
  })
  archiveSession(
    @Request() req: any,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.service.archiveSession(this.getUserId(req), sessionId);
  }

  private getUserId(req: any): string {
    const userId = req.user?.id ?? req.user?.sub;
    if (userId) return userId;

    const devUserId = req.headers?.['x-user-id'];
    if (process.env.NODE_ENV !== 'production' && devUserId) {
      return Array.isArray(devUserId) ? devUserId[0] : devUserId;
    }

    throw new UnauthorizedException('Authenticated user is required');
  }
}
