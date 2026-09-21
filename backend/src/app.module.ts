import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DocumentTypesModule } from './document-types/document-types.module.js';
import { PartiesModule } from './parties/parties.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DocumentTypesModule,
    PartiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
