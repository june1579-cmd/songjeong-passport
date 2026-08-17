export type SessionSelectionMode = "select" | "fixed";
export const SESSION_MODE_LABEL: Record<SessionSelectionMode, string> = {
  select: "회차 자유 선택",
  fixed: "고정 기수제 (전체 회차 함께 진행)",
};

export interface Program {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  address: string | null;
  fee: string | null;
  target: string | null;
  requirement: string | null;
  prep: string | null;
  instructor: string | null;
  instructor_bio: string | null;
  instructor_photo_url: string | null;
  emoji: string | null;
  capacity: number | null;
  waiting_capacity: number | null;
  status: string;
  program_status: ProgramStatus;
  category: string | null;
  next_program_id: string | null;
  next_teaser: string | null;
  is_published: boolean;
  session_selection_mode: SessionSelectionMode;
  max_selectable_sessions: number | null;
}

export type ProgramStatus = "draft" | "scheduled" | "recruiting" | "closed" | "in_progress" | "completed" | "cancelled";

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  draft: "임시저장",
  scheduled: "게시예정",
  recruiting: "모집중",
  closed: "모집마감",
  in_progress: "진행중",
  completed: "종료",
  cancelled: "취소",
};

export const PROGRAM_CATEGORIES = ["스포츠", "환경", "미술", "공예", "문화", "지역활동", "가족", "기타"];

export interface Session {
  id: string;
  program_id: string;
  session_label: string;
  session_date: string;
  start_time: string;
  end_time: string;
  qr_token: string;
  capacity: number | null;
}

export interface Participant {
  id: string;
  name: string;
  phone4: string;
  phone_number: string | null;
  age_group: string;
  residence_area: string;
  residence_district: string | null;
  residence_dong: string | null;
  privacy_consent_at: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  participant_id: string;
  program_id: string | null;
  channel: string;
  message: string;
  status: string;
  created_at: string;
}

export type ApplicationStatus = "applied" | "selected" | "waitlisted" | "rejected" | "cancelled";

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "신청완료(선정대기)",
  selected: "선정",
  waitlisted: "대기",
  rejected: "미선정",
  cancelled: "취소",
};

export interface Registration {
  id: string;
  participant_id: string;
  program_id: string;
  acquisition_channel: string;
  registered_at: string;
  status: ApplicationStatus;
}

export interface Attendance {
  id: string;
  participant_id: string;
  program_id: string;
  session_id: string;
  checked_in_at: string;
}

export interface Survey {
  id: string;
  participant_id: string;
  program_id: string;
  satisfaction: number;
  revisit_intention: string;
  next_interest: string | null;
  submitted_at: string;
}

export interface Announcement {
  id: string;
  program_id: string | null;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
}

export interface Photo {
  id: string;
  program_id: string | null;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export interface Consent {
  id: string;
  participant_id: string;
  consent_type: string;
  consent_version: string;
  agreed: boolean;
  agreed_at: string;
}

export interface Review {
  id: string;
  participant_id: string;
  program_id: string;
  author_name: string;
  rating: number | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

export interface RegistrationSession {
  id: string;
  registration_id: string;
  session_id: string;
  participant_id: string;
  program_id: string;
  created_at: string;
}

export interface ProgramMessage {
  id: string;
  program_id: string;
  participant_id: string;
  author_name: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

export const AGE_OPTIONS = ["10대", "20대", "30대", "40대", "50대", "60대 이상"];
export const RESIDENCE_OPTIONS = ["송정동", "해운대구 다른 지역", "부산 다른 지역", "기타"];
export const BUSAN_DISTRICTS = [
  "해운대구", "부산진구", "동래구", "수영구", "남구", "연제구", "금정구",
  "북구", "사상구", "사하구", "강서구", "중구", "서구", "동구", "영도구", "기장군", "타지역",
];
export const CHANNEL_OPTIONS = ["동주민센터", "기존 프로그램", "지인 추천", "카카오톡", "SNS", "현수막/포스터", "기타"];
export const INTEREST_OPTIONS = ["서핑", "해양스포츠", "환경", "미술", "공예", "사진", "지역문화", "기타"];
export const REVISIT_OPTIONS = ["꼭 참여하고 싶어요", "관심 있어요", "잘 모르겠어요", "참여하지 않을 것 같아요"];
export const COMMON_VENUES = [
  { label: "송정해수욕장 (더 서프)", address: "부산광역시 해운대구 송정광어골로 29" },
  { label: "갈포행복마을센터 5층", address: "해운대구 송정동" },
];
