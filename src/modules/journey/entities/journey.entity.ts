import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { JourneyDay } from './journey-day.entity';

@Entity()
export class Journey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  coverImage: string;

  @ManyToOne(() => User, (user) => user.journeys)
  user: User;

  @OneToMany(() => JourneyDay, (day) => day.journey, { cascade: true })
  days: JourneyDay[];
}
