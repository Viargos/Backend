import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { JourneyDay } from './journey-day.entity';
import { JourneyMedia } from './journey-media.entity';

export enum PlaceType {
  STAY = 'STAY',
  ACTIVITY = 'ACTIVITY',
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  NOTE = 'NOTE',
}

@Entity()
export class JourneyDayPlace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PlaceType,
  })
  type: PlaceType;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @ManyToOne(() => JourneyDay, (day) => day.places, {
    onDelete: 'CASCADE',
  })
  journeyDay: JourneyDay;

  @OneToMany(() => JourneyMedia, (media) => media.journeyDayPlace, {
    cascade: true,
  })
  media: JourneyMedia[];
}