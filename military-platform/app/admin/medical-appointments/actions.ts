'use server';

import { db } from '@/lib/firebase/server/config'; // Firebase Admin 초기화 경로 확인 필요
import { MedicalAppointmentSlot } from '@/types';
import admin from 'firebase-admin';
import { revalidatePath } from 'next/cache';

const slotsCollection = db.collection('medicalAppointmentSlots');

// 외진 슬롯 목록 조회 Action
export async function getAppointmentSlotsAction(): Promise<MedicalAppointmentSlot[]> {
  try {
    const snapshot = await slotsCollection.orderBy('appointmentDate', 'asc').orderBy('startTime', 'asc').get();
    const slots = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Firestore Timestamp를 Date 객체로 변환 (클라이언트 호환성)
            appointmentDate: (data.appointmentDate as admin.firestore.Timestamp).toDate(),
            createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate() : undefined,
            updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate() : undefined,
        } as MedicalAppointmentSlot; // 타입 단언
    });
    return slots;
  } catch (error) {
    console.error('[Server Action Error] getAppointmentSlotsAction:', error);
    // 실제 앱에서는 좀 더 사용자 친화적인 오류 처리 필요
    throw new Error('외진 슬롯 목록을 불러오는 데 실패했습니다.');
  }
}

// 새 외진 슬롯 추가 Action
export async function addAppointmentSlotAction(
    formData: Omit<MedicalAppointmentSlot, 'id' | 'createdAt' | 'updatedAt' | 'applicantIds' | 'status'>
): Promise<{ success: boolean; error?: string }> {
  try {
    let appointmentDateTimestamp: admin.firestore.Timestamp;
    if (formData.appointmentDate instanceof Date) {
      appointmentDateTimestamp = admin.firestore.Timestamp.fromDate(formData.appointmentDate);
    } else if (typeof formData.appointmentDate === 'string') {
        appointmentDateTimestamp = admin.firestore.Timestamp.fromDate(new Date(formData.appointmentDate));
    } else if (formData.appointmentDate instanceof admin.firestore.Timestamp) {
        appointmentDateTimestamp = formData.appointmentDate;
    } else {
      console.error('Invalid appointmentDate type received in addAppointmentSlotAction:', formData.appointmentDate);
      throw new Error('유효하지 않은 날짜 형식입니다.');
    }

    const newSlot = {
      ...formData,
      appointmentDate: appointmentDateTimestamp,
      applicantIds: [],
      status: 'available' as const,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await slotsCollection.add(newSlot);
    revalidatePath('/admin/medical-appointments'); // 데이터 변경 후 경로 캐시 갱신
    return { success: true };

  } catch (error: any) {
    console.error('[Server Action Error] addAppointmentSlotAction:', error);
    return { success: false, error: error.message || '외진 슬롯 추가에 실패했습니다.' };
  }
}

// 외진 슬롯 수정 Action
export async function updateAppointmentSlotAction(
    slotId: string,
    updateData: Partial<Omit<MedicalAppointmentSlot, 'id' | 'createdAt' | 'applicantIds'> >
): Promise<{ success: boolean; error?: string }> {
  try {
    const dataToUpdate: { [key: string]: any } = {
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (updateData.appointmentDate) {
        let updatedTimestamp: admin.firestore.Timestamp;
        if (updateData.appointmentDate instanceof Date) {
            updatedTimestamp = admin.firestore.Timestamp.fromDate(updateData.appointmentDate);
        } else if (typeof updateData.appointmentDate === 'string') {
             updatedTimestamp = admin.firestore.Timestamp.fromDate(new Date(updateData.appointmentDate));
        } else if (updateData.appointmentDate instanceof admin.firestore.Timestamp) {
            updatedTimestamp = updateData.appointmentDate;
        } else {
            console.error('Invalid appointmentDate type received in updateAppointmentSlotAction:', updateData.appointmentDate);
            throw new Error('유효하지 않은 날짜 형식입니다.');
        }
        dataToUpdate.appointmentDate = updatedTimestamp;
    }

    // null 또는 undefined 값 제거
    Object.keys(dataToUpdate).forEach(key => {
        if (dataToUpdate[key] === undefined) { // null은 유효할 수 있으므로 undefined만 제거 (필요시 조정)
            delete dataToUpdate[key];
        }
    });

    // 업데이트할 필드가 updatedAt 외에 더 있는지 확인
    const fieldsToUpdate = Object.keys(dataToUpdate).filter(key => key !== 'updatedAt');
    if (fieldsToUpdate.length > 0) {
      await slotsCollection.doc(slotId).update(dataToUpdate);
      revalidatePath('/admin/medical-appointments'); // 캐시 갱신
      return { success: true };
    } else {
        // updatedAt만 있다면 실제 업데이트는 불필요
        return { success: true }; 
    }

  } catch (error: any) {
    console.error(`[Server Action Error] updateAppointmentSlotAction (ID: ${slotId}):`, error);
    return { success: false, error: error.message || '외진 슬롯 수정에 실패했습니다.' };
  }
}

// 외진 슬롯 삭제 Action
export async function deleteAppointmentSlotAction(slotId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await slotsCollection.doc(slotId).delete();
    revalidatePath('/admin/medical-appointments'); // 캐시 갱신
    return { success: true };
  } catch (error: any) {
    console.error(`[Server Action Error] deleteAppointmentSlotAction (ID: ${slotId}):`, error);
    return { success: false, error: error.message || '외진 슬롯 삭제에 실패했습니다.' };
  }
} 