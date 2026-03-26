// src/events/events.service.ts
import { Injectable } from '@nestjs/common';
import { EventsGateway } from './gateways/events.gateway';
import { dateUtils } from '../utils/date.utils';

@Injectable()
export class EventsService {
  constructor(private eventsGateway: EventsGateway) {}

  private getUserName(user: any): string {
    if (user?.profile?.first_name || user?.profile?.last_name) {
      return `${user.profile.first_name} ${user.profile.last_name}`.trim();
    }
    return user?.email?.split('@')[0] || 'Пользователь';
  }

  private formatDateTime(date: string, time: string): string {
    const local = dateUtils.toLocal(date, time);
    return `${dateUtils.formatDisplay(local.date)} в ${local.time}`;
  }

  // Новая заявка
  notifyNewBooking(tutorId: number, booking: any) {
    this.eventsGateway.sendToUser(tutorId, 'booking:new', {
      id: booking.id,
      studentId: booking.student_id,
      studentName: this.getUserName(booking.student),
      date: booking.date,
      time: booking.time,
      dateTime: this.formatDateTime(booking.date, booking.time),
      type: booking.recurring_id ? 'recurring' : 'individual',
      status: booking.status,
      timestamp: new Date().toISOString(),
    });
  }

  // Изменение статуса заявки
  notifyBookingUpdated(booking: any) {
    const data = {
      id: booking.id,
      status: booking.status,
      date: booking.date,
      time: booking.time,
      dateTime: this.formatDateTime(booking.date, booking.time),
      timestamp: new Date().toISOString(),
    };
    this.eventsGateway.sendToUser(booking.student_id, 'booking:updated', data);
    this.eventsGateway.sendToUser(booking.tutor_id, 'booking:updated', data);
  }

  // Запрос на перенос
  notifyRescheduleRequested(reschedule: any) {
    const booking = reschedule.booking;
    const receiverId = reschedule.requested_by === 'student' 
      ? booking.tutor_id 
      : booking.student_id;
    
    this.eventsGateway.sendToUser(receiverId, 'reschedule:requested', {
      id: reschedule.id,
      bookingId: reschedule.booking_id,
      requesterName: this.getUserName(reschedule.requested_by_user),
      requesterRole: reschedule.requested_by,
      oldDateTime: this.formatDateTime(reschedule.old_date, reschedule.old_time),
      newDateTime: this.formatDateTime(reschedule.new_date, reschedule.new_time),
      reason: reschedule.reason,
      timestamp: new Date().toISOString(),
    });
  }

  // Статус переноса изменен
notifyRescheduleStatusChanged(reschedule: any) {
  const booking = reschedule.booking;
  
  // Данные для уведомления
  const notificationData = {
    id: reschedule.id,
    bookingId: reschedule.booking_id,
    status: reschedule.status,
    newDateTime: reschedule.status === 'confirmed' 
      ? this.formatDateTime(reschedule.new_date, reschedule.new_time)
      : null,
    timestamp: new Date().toISOString(),
  };
  
  // Отправляем запросившей стороне
  this.eventsGateway.sendToUser(reschedule.requested_by_id, 'reschedule:status_changed', {
    ...notificationData,
    role: 'requester',
  });
  
  // Отправляем другой стороне (репетитору или ученику)
  const otherUserId = reschedule.requested_by === 'student' 
    ? booking.tutor_id 
    : booking.student_id;
  
  this.eventsGateway.sendToUser(otherUserId, 'reschedule:status_changed', {
    ...notificationData,
    role: 'other',
  });
  
  console.log(`📡 Уведомление о переносе отправлено пользователям: ${reschedule.requested_by_id} и ${otherUserId}`);
}

  // Отметка посещения
  notifyAttendanceMarked(attendance: any) {
    this.eventsGateway.sendToUser(attendance.student_id, 'attendance:marked', {
      id: attendance.id,
      bookingId: attendance.booking_id,
      attended: attendance.visited,
      date: attendance.date,
      time: attendance.time,
      dateTime: this.formatDateTime(attendance.date, attendance.time),
      timestamp: new Date().toISOString(),
    });
  }

  // Новая групповая заявка для репетитора
  notifyNewGroupBooking(groupBooking: any) {
    const groupListing = groupBooking.group_listing;
    const studentName = this.getUserName(groupBooking.student);
    
    this.eventsGateway.sendToUser(groupListing.tutor_id, 'group_booking:new', {
      id: groupBooking.id,
      groupListingId: groupBooking.group_listing_id,
      groupTitle: groupListing.subject,
      studentId: groupBooking.student_id,
      studentName,
      status: groupBooking.status,
      timestamp: new Date().toISOString(),
    });
  }

  // 👇 ДОБАВЛЕННЫЙ МЕТОД
  // Изменение статуса групповой заявки
  notifyGroupBookingStatusChanged(groupBooking: any) {
    const groupListing = groupBooking.group_listing;
    const studentId = groupBooking.student_id;
    const tutorId = groupListing.tutor_id;
    
    const statusMessages = {
      pending: 'ожидает рассмотрения',
      approved: 'одобрена',
      rejected: 'отклонена',
    };
    
    const data = {
      id: groupBooking.id,
      groupListingId: groupBooking.group_listing_id,
      groupTitle: groupListing.subject,
      status: groupBooking.status,
      statusText: statusMessages[groupBooking.status] || groupBooking.status,
      timestamp: new Date().toISOString(),
    };
    
    this.eventsGateway.sendToUser(studentId, 'group_booking:status_changed', data);
    this.eventsGateway.sendToUser(tutorId, 'group_booking:status_changed', data);
  }

  // Изменение состава группы
  notifyGroupStudentsChanged(groupListingId: number, data: {
    action: 'joined' | 'left';
    studentId: number;
    studentName: string;
    currentCount: number;
    maxStudents: number;
  }) {
    this.eventsGateway.sendToRoom(`group:${groupListingId}`, 'group:students_changed', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}