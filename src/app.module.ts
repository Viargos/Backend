import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import serverConfig from './config/server.config';
import databaseConfig from './config/database.config';
import tokenConfig from './config/token.config';
import { CoreModule } from './core/core.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [serverConfig, databaseConfig, tokenConfig],
      cache: true,
      envFilePath: getEnvFilePath(),
    }),
    CoreModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

function getEnvFilePath() {
  return process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
}
