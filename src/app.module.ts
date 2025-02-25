import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealersModule } from './modules/dealers/dealers.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { GoogleDriveModule } from './modules/google-drive/google-drive.module';
import { SurveyFormModule } from './modules/survey-form/survey-form.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsRun: true,
      }),
      inject: [ConfigService],
    }),
    DealersModule,
    SurveysModule,
    GoogleDriveModule,
    SurveyFormModule,
  ],
})
export class AppModule {}
