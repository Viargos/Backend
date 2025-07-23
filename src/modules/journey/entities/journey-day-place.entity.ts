import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JourneyDay } from './journey-day.entity';

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

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @ManyToOne(() => JourneyDay, (day) => day.places)
  journeyDay: JourneyDay;
}
