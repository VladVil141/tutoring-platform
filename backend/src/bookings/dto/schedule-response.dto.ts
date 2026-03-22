export class ScheduleEventDto {
  id: number;
  type: 'individual' | 'group';
  subject: string;
  date: string;
  time: string;
  status: string;
  student_name?: string;
  student_id?: number;
  tutor_name?: string;
  tutor_id?: number;
  group_size?: number;
  current_students?: number;
  max_students?: number;
}