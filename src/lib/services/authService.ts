import { invoke } from '@tauri-apps/api/core';
import { seqtaFetch } from '../../utils/netUtil';
import { cache } from '../../utils/cache';

export interface UserInfo {
  clientIP: string;
  email: string;
  id: number;
  lastAccessedTime: number;
  meta: {
    code: string;
    governmentID: string;
  };
  personUUID: string;
  saml: [
    {
      autologin: boolean;
      label: string;
      method: string;
      request: string;
      sigalg: URL;
      signature: string;
      slo: boolean;
      url: URL;
    },
  ];
  status: string;
  type: string;
  userCode: string;
  userDesc: string;
  userName: string;
  displayName?: string;
  profilePicture?: string;
}

function binaryStringToBase64(binaryStr: string): string {
  let bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i) & 0xff;
  }

  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

export const authService = {
  async checkSession(): Promise<boolean> {
    return await invoke<boolean>('check_session_exists');
  },

  async startLogin(seqtaUrl: string): Promise<void> {
    if (!seqtaUrl) return;
    await invoke('create_login_window', { url: seqtaUrl });
  },

  async logout(): Promise<boolean> {
    return await invoke('logout');
  },

  async loadUserInfo(options?: { disableSchoolPicture?: boolean }): Promise<UserInfo | undefined> {
    try {
      if (options?.disableSchoolPicture) {
        cache.delete('userInfo');
      }
      
      const cachedUserInfo = cache.get<UserInfo>('userInfo');
      if (cachedUserInfo) {
        return cachedUserInfo;
      }

      const res = await seqtaFetch('/seqta/student/login?', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: {},
      });
      const userInfo: UserInfo = JSON.parse(res).payload;

      if (!options?.disableSchoolPicture) {
        const profileImage = await seqtaFetch(`/seqta/student/photo/get`, {
          params: { uuid: userInfo.personUUID, format: 'low' },
          is_image: true,
        });
        userInfo.profilePicture = `data:image/png;base64,${profileImage}`;
      }

      cache.set('userInfo', userInfo);
      return userInfo;
    } catch (e) {
      console.error('Failed to load user info:', e);
      return undefined;
    }
  },

  async getAPIData(url: string, parameters: Map<string, string>): Promise<any> {
    return await invoke('get_api_data', {
      url,
      parameters: Object.fromEntries(parameters),
    });
  },

  async postAPIData(url: string, data: Map<string, string>): Promise<any> {
    return await invoke('post_api_data', {
      url,
      data: Object.fromEntries(data),
    });
  },
};