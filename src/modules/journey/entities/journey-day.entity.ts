import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Journey } from './journey.entity';
import { JourneyDayPlace } from './journey-day-place.entity';

@Entity()
export class JourneyDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  dayNumber: number;

  @Column()
  date: Date;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => Journey, (journey) => journey.days, {
    onDelete: 'CASCADE',
  })
  journey: Journey;

  @OneToMany(() => JourneyDayPlace, (place) => place.journeyDay, {
    cascade: true,
  })
  places: JourneyDayPlace[];
}
