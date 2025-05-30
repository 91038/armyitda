import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getUserById, 
  UserData 
} from '../../firebase';
import { User as FirebaseUser } from 'firebase/auth';

// 사용자 타입 정의
interface User {
  id: string;
  militaryId: string;
  name: string;
  rank: string;
  unitCode: string;
  unitName: string;
  role: 'soldier' | 'officer' | 'admin';
  enlistmentDate?: string;
}

// 인증 상태 인터페이스
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 초기 상태
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// 회원가입 비동기 액션
export const register = createAsyncThunk(
  'auth/register',
  async ({ 
    militaryId, 
    password, 
    name, 
    rank, 
    unitCode,
    unitName,
    enlistmentDate
  }: { 
    militaryId: string; 
    password: string; 
    name: string; 
    rank: string; 
    unitCode: string;
    unitName: string;
    enlistmentDate: Date;
  }, { rejectWithValue }) => {
    try {
      const userCredential = await registerUser(militaryId, password, name, rank, unitCode, unitName, enlistmentDate);
      const userData = await getUserById(userCredential.user.uid);
      
      return {
        user: {
          id: userCredential.user.uid,
          militaryId,
          name,
          rank,
          unitCode,
          unitName,
          role: 'soldier' as const,
          enlistmentDate: enlistmentDate.toISOString(),
        },
        token: await userCredential.user.getIdToken()
      };
    } catch (error: any) {
      return rejectWithValue(error.message || '회원가입 실패');
    }
  }
);

// 로그인 비동기 액션
export const login = createAsyncThunk(
  'auth/login',
  async ({ militaryId, password }: { militaryId: string; password: string }, { rejectWithValue }) => {
    try {
      const userCredential = await loginUser(militaryId, password);
      const userData = await getUserById(userCredential.user.uid);
      
      if (!userData) {
        throw new Error('사용자 데이터를 찾을 수 없습니다');
      }
      
      return {
        user: {
          id: userCredential.user.uid,
          militaryId: userData.militaryId,
          name: userData.name,
          rank: userData.rank,
          unitCode: userData.unitCode,
          unitName: userData.unitName,
          role: userData.role,
          enlistmentDate: userData.enlistmentDate,
        },
        token: await userCredential.user.getIdToken()
      };
    } catch (error: any) {
      return rejectWithValue(error.message || '로그인 실패');
    }
  }
);

// 로그아웃 비동기 액션
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutUser();
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || '로그아웃 실패');
    }
  }
);

// 인증 슬라이스 생성
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // 회원가입
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    
    // 로그인
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    
    // 로그아웃
    builder.addCase(logout.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(logout.fulfilled, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = null;
    });
    builder.addCase(logout.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { updateUserProfile, clearError } = authSlice.actions;
export default authSlice.reducer; 