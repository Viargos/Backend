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

  @Column({ length: 16, nullable: true })
  s2CellIdLevel10?: string;

  @Column({ length: 16, nullable: true })
  s2CellIdLevel12?: string;

  @Column({ length: 16, nullable: true })
  s2CellIdLevel14?: string;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({ type: 'integer', nullable: true })
  order: number;

  @Column({ nullable: true })
  bookingGroupId?: string;

  @Column({ type: 'integer', nullable: true })
  bookingStartDayNumber?: number;

  @Column({ type: 'integer', nullable: true })
  bookingEndDayNumber?: number;

  @ManyToOne(() => JourneyDay, (day) => day.places, {
    onDelete: 'CASCADE',
  })
  journeyDay: JourneyDay;

  @OneToMany(() => JourneyMedia, (media) => media.journeyDayPlace, {
    cascade: true,
  })
  media: JourneyMedia[];
}
