"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"

import { cn } from "@/lib/utils"
import { addSoldier } from "@/lib/api/soldiers"

// 폼 스키마 정의
const formSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다."),
  serialNumber: z.string().min(5, "군번은 5자 이상이어야 합니다."),
  rank: z.string().min(1, "계급을 선택해주세요."),
  unit: z.string().min(1, "부대를 입력해주세요."),
  position: z.string().min(1, "보직을 입력해주세요."),
  enlistmentDate: z.date({
    required_error: "입대일을 선택해주세요.",
  }),
  dischargeDate: z.date({
    required_error: "전역일을 선택해주세요.",
  }),
  contact: z.object({
    phone: z.string().min(1, "전화번호를 입력해주세요."),
    email: z.string().email("유효한 이메일을 입력해주세요."),
    address: z.string().min(1, "주소를 입력해주세요."),
    emergencyContact: z.string().min(1, "비상연락처를 입력해주세요."),
  }),
  healthStatus: z.enum(["양호", "경계", "관심"], {
    required_error: "건강상태를 선택해주세요."
  }),
  mentalHealthRisk: z.enum(["낮음", "중간", "높음"], {
    required_error: "정신건강 위험도를 선택해주세요."
  }),
  specialSkills: z.array(z.string()).default([]),
  education: z.string().default("고졸"),
  note: z.string().default(""),
  drivingSkill: z.enum(["요숙련", "준숙련", "숙련"]).optional(),
})

// 페이지에서 사용할 폼 타입
type FormValues = z.infer<typeof formSchema>

// 데이터 변환 인터페이스 - Firestore용
interface SoldierDataForFirestore {
  name: string;
  serialNumber: string;
  rank: string;
  unit: string;
  position: string;
  enlistmentDate: string;
  dischargeDate: string;
  contact: {
    phone: string;
    email: string;
    address: string;
    emergencyContact: string;
  };
  healthStatus: string;
  mentalHealthRisk: string;
  specialSkills: string[];
  education: string;
  note: string;
  drivingSkill?: "요숙련" | "준숙련" | "숙련";
}

// 병사 계급 목록
const ranks = [
  { label: "이병", value: "이병" },
  { label: "일병", value: "일병" },
  { label: "상병", value: "상병" },
  { label: "병장", value: "병장" },
]

// 건강 상태 옵션
const healthStatusOptions = [
  { label: "양호", value: "양호" },
  { label: "경계", value: "경계" },
  { label: "관심", value: "관심" },
]

// 정신건강 위험도 옵션
const mentalHealthRiskOptions = [
  { label: "낮음", value: "낮음" },
  { label: "중간", value: "중간" },
  { label: "높음", value: "높음" },
]

// 소속 부대 옵션 (예시)
const unitOptions = [
  { label: "1소대", value: "1소대" },
  { label: "2소대", value: "2소대" },
  { label: "3소대", value: "3소대" },
  { label: "직할중대", value: "직할중대" },
]

// 보직 옵션 (예시)
const positionOptions = [
  { label: "행정병", value: "행정병" },
  { label: "운전병", value: "운전병" },
  { label: "통신병", value: "통신병" },
  { label: "취사병", value: "취사병" },
  { label: "의무병", value: "의무병" },
  { label: "정비병", value: "정비병" },
]

// 운전기량 옵션
const drivingSkillOptions = [
  { label: "요숙련", value: "요숙련" },
  { label: "준숙련", value: "준숙련" },
  { label: "숙련", value: "숙련" },
]

export default function NewSoldierPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 폼 초기화
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      serialNumber: "",
      rank: "",
      unit: "",
      position: "",
      contact: {
        phone: "",
        email: "",
        address: "",
        emergencyContact: "",
      },
      healthStatus: "양호",
      mentalHealthRisk: "낮음",
      specialSkills: [],
      education: "고졸",
      note: "",
      drivingSkill: undefined,
    },
  })

  // 폼 제출 처리
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      // 날짜 형식을 ISO 문자열로 변환하고 Firestore용 데이터 구조로 변환
      const formattedData = {
        ...values,
        enlistmentDate: values.enlistmentDate.toISOString(),
        dischargeDate: values.dischargeDate.toISOString(),
        specialSkills: values.specialSkills || [],
      }
      
      await addSoldier(formattedData)
      toast({
        title: "병사 등록 완료",
        description: "새로운 병사가 등록되었습니다.",
      })
      router.push("/soldiers")
    } catch (error) {
      console.error("병사 등록 실패:", error)
      toast({
        title: "병사 등록 실패",
        description: "병사 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">병사 추가</h1>
        <Button variant="outline" onClick={() => router.push("/soldiers")}>
          목록으로 돌아가기
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>신규 병사 정보</CardTitle>
          <CardDescription>
            새로운 병사의 기본 정보를 입력하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* 기본 인적사항 */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름</FormLabel>
                      <FormControl>
                        <Input placeholder="홍길동" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>군번</FormLabel>
                      <FormControl>
                        <Input placeholder="22-12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>계급</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="계급 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ranks.map((rank) => (
                            <SelectItem key={rank.value} value={rank.value}>
                              {rank.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>소속</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="소속 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unitOptions.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>보직</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="보직 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {positionOptions.map((position) => (
                            <SelectItem key={position.value} value={position.value}>
                              {position.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 연락처 정보 */}
                <div className="space-y-4">
                  <div>
                    <FormField
                      control={form.control}
                      name="contact.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>전화번호</FormLabel>
                          <FormControl>
                            <Input placeholder="전화번호를 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="contact.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이메일</FormLabel>
                          <FormControl>
                            <Input placeholder="이메일을 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="contact.address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>주소</FormLabel>
                          <FormControl>
                            <Input placeholder="주소를 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="contact.emergencyContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>비상연락처</FormLabel>
                          <FormControl>
                            <Input placeholder="비상연락처를 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* 입대일 및 전역일 */}
                <FormField
                  control={form.control}
                  name="enlistmentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>입대일</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ko })
                              ) : (
                                <span>날짜 선택</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dischargeDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>전역 예정일</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ko })
                              ) : (
                                <span>날짜 선택</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 건강 상태 */}
                <FormField
                  control={form.control}
                  name="healthStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>건강 상태</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="건강 상태 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {healthStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="mentalHealthRisk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정신건강 위험도</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="위험도 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mentalHealthRiskOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 추가 정보 */}
                <FormField
                  control={form.control}
                  name="drivingSkill"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>운전기량</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="운전기량 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">선택 안함</SelectItem>
                          {drivingSkillOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        운전병인 경우 운전기량을 선택하세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="specialSkills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>특기/자격증</FormLabel>
                      <FormControl>
                        <Input placeholder="컴퓨터활용능력 1급" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>학력</FormLabel>
                      <FormControl>
                        <Input placeholder="OO대학교 컴퓨터공학과" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>특이사항</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="병사에 대한 특이사항을 입력하세요"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/soldiers")}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  병사 등록
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
} 