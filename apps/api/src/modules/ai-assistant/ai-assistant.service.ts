import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GUARDRAILS = [
  'compra', 'vende', 'invierte en', 'te recomiendo comprar',
  'garantizo', 'retorno asegurado', 'sin riesgo',
];

@Injectable()
export class AiAssistantService {
  constructor(private readonly config: ConfigService) {}

  async chat(userId: string, message: string, context: any = {}) {
    this.enforceGuardrails(message);

    const systemPrompt = this.buildSystemPrompt(context);

    // Call AI provider
    const reply = await this.callAiProvider(systemPrompt, message);

    // TODO: save AssistantSession & AssistantMessage to DB
    // TODO: log AIUsageRecord

    return {
      reply,
      disclaimer: 'SmartWallet AI Assistant proporciona información descriptiva basada en tus datos. No constituye asesoría financiera regulada.',
    };
  }

  private enforceGuardrails(message: string) {
    const lower = message.toLowerCase();
    const blocked = GUARDRAILS.some((kw) => lower.includes(kw));
    if (blocked) {
      throw new ForbiddenException(
        'El AI Assistant no puede ofrecer recomendaciones de compra/venta ni asesoría financiera regulada.',
      );
    }
  }

  private buildSystemPrompt(context: any) {
    return `Eres el AI Assistant de SmartWallet, una plataforma de finanzas personales.
Tu función es:
- Explicar indicadores financieros del usuario basándote en sus datos registrados.
- Generar resúmenes de gastos, ingresos y patrones financieros.
- Ayudar al usuario a navegar y usar la plataforma.
- Responder preguntas sobre conceptos financieros generales con lenguaje educativo.

Restricciones absolutas:
- NO ofrecer asesoría financiera regulada.
- NO recomendar compra o venta de instrumentos financieros.
- NO garantizar resultados económicos.
- NO acceder a datos externos no proporcionados en el contexto.

Contexto del usuario: ${JSON.stringify(context)}
Idioma: español.`;
  }

  private async callAiProvider(system: string, message: string): Promise<string> {
    const provider = this.config.get('AI_PROVIDER', 'anthropic');
    // TODO: implement actual AI provider call
    // Placeholder response
    return `[AI Assistant] He recibido tu consulta: "${message}". Esta funcionalidad está en desarrollo.`;
  }
}
