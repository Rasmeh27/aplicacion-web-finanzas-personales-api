import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService }    from './ai-assistant.service';

@Module({
  imports: [],
  controllers: [AiAssistantController],
  providers: [AiAssistantService],
})
export class AiAssistantModule {}
