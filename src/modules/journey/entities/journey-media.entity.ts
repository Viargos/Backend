import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JourneyDayPlace } from './journey-day-place.entity';

export enum JourneyMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('journey_media')
export class JourneyMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'journey_day_place_id' })
  journeyDayPlaceId: string;

  @Column({
    type: 'enum',
    enum: JourneyMediaType,
  })
  type: JourneyMediaType;

  @Column()
  url: string;

  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Column({ nullable: true })
  duration?: number; // For videos

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => JourneyDayPlace, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journey_day_place_id' })
  journeyDayPlace: JourneyDayPlace;
}


