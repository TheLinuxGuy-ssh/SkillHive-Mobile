import { create } from "zustand";

type MeetingStore = {
  activeRoomName: string | null;

  isMeetingActive: boolean;
  isMinimized: boolean;

  setMeeting: (
    roomName: string | null,
  ) => void;

  minimize: () => void;

  expand: () => void;

  endMeeting: () => void;
};

export const useMeetingStore =
  create<MeetingStore>((set) => ({
    activeRoomName: null,

    isMeetingActive: false,

    isMinimized: false,

    setMeeting: (roomName) =>
      set({
        activeRoomName: roomName,

        isMeetingActive:
          roomName !== null,
      }),

    minimize: () =>
      set({
        isMinimized: true,
      }),

    expand: () =>
      set({
        isMinimized: false,
      }),

    endMeeting: () =>
      set({
        activeRoomName: null,

        isMeetingActive: false,

        isMinimized: false,
      }),
  }));