import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLinkedBookingFieldsToJourneyDayPlace1769532334000 implements MigrationInterface {
  name = 'AddLinkedBookingFieldsToJourneyDayPlace1769532334000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('journey_day_place', [
      new TableColumn({
        name: 'bookingGroupId',
        type: 'varchar',
        isNullable: true,
        comment: 'Shared identifier for linked bookings spanning multiple days',
      }),
      new TableColumn({
        name: 'bookingStartDayNumber',
        type: 'integer',
        isNullable: true,
        comment: 'First journey day number included in the linked booking',
      }),
      new TableColumn({
        name: 'bookingEndDayNumber',
        type: 'integer',
        isNullable: true,
        comment: 'Last journey day number included in the linked booking',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('journey_day_place', 'bookingEndDayNumber');
    await queryRunner.dropColumn('journey_day_place', 'bookingStartDayNumber');
    await queryRunner.dropColumn('journey_day_place', 'bookingGroupId');
  }
}
