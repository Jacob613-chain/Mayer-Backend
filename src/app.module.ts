import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealersModule } from './modules/dealers/dealers.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { S3Module } from './modules/s3/s3.module';
import { SurveyFormModule } from './modules/survey-form/survey-form.module';
import { AdminModule } from './modules/admin/admin.module';

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
    S3Module,
    SurveysModule,
    SurveyFormModule,
    AdminModule,
  ],
})
export class AppModule {}
