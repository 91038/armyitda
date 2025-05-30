"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { z } from "zod"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSoldier, updateSoldier } from "@/lib/api/soldiers"

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

const EditSoldierPage = () => {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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
        emergencyContact: ""
      },
      specialSkills: [],
      education: "고졸",
      note: ""
    }
  })
  
  useEffect(() => {
    const fetchSoldier = async () => {
      setIsLoading(true)
      try {
        const response = await getSoldier(id)
        
        if (!response.success || !response.data) {
          setError("병사 정보를 찾을 수 없습니다.")
          return
        }
        
        const soldier = response.data
        
        // 날짜 문자열을 Date 객체로 변환
        const enlistmentDate = new Date(soldier.enlistmentDate)
        const dischargeDate = new Date(soldier.dischargeDate)
        
        form.reset({
          ...soldier,
          enlistmentDate,
          dischargeDate,
          contact: soldier.contact || {
            phone: "",
            email: "",
            address: "",
            emergencyContact: ""
          },
          specialSkills: soldier.specialSkills || [],
          education: soldier.education || "고졸",
          note: soldier.note || ""
        })
      } catch (error) {
        console.error("병사 정보 조회 실패:", error)
        setError("병사 정보를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSoldier()
  }, [id, form])
  
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
      
      await updateSoldier(id, formattedData)
      toast({
        title: "병사 정보 수정 완료",
        description: "병사 정보가 성공적으로 수정되었습니다.",
      })
      router.push(`/soldiers/${id}`)
    } catch (error) {
      console.error("병사 정보 수정 실패:", error)
      toast({
        title: "병사 정보 수정 실패",
        description: "병사 정보 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // 계급 옵션
  const rankOptions = [
    "이병", "일병", "상병", "병장",
    "하사", "중사", "상사", "원사",
    "소위", "중위", "대위", "소령", "중령", "대령"
  ]
  
  // 건강 상태 옵션
  const healthStatusOptions = ["양호", "경계", "관심"]
  
  // 정신건강 위험도 옵션
  const mentalHealthRiskOptions = ["낮음", "중간", "높음"]
  
  // 운전 숙련도 옵션
  const drivingSkillOptions = ["요숙련", "준숙련", "숙련"]
  
  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>병사 정보를 불러오는 중...</span>
      </div>
    )
  }
  
  // 에러가 있을 때
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => router.push("/soldiers")}>병사 목록으로 돌아가기</Button>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">병사 정보 수정</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>병사 정보 수정 양식</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 이름 */}
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
                
                {/* 군번 */}
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>군번</FormLabel>
                      <FormControl>
                        <Input placeholder="12-34567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 계급 */}
                <FormField
                  control={form.control}
                  name="rank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>계급</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="계급 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rankOptions.map((rank) => (
                            <SelectItem key={rank} value={rank}>
                              {rank}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 부대 */}
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>부대</FormLabel>
                      <FormControl>
                        <Input placeholder="제00사단 00연대 0대대" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 보직 */}
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>보직</FormLabel>
                      <FormControl>
                        <Input placeholder="운전병" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 입대일 */}
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
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "yyyy-MM-dd")
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
                
                {/* 전역일 */}
                <FormField
                  control={form.control}
                  name="dischargeDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>전역일</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "yyyy-MM-dd")
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
              </div>
              
              {/* 연락처 정보 */}
              <div className="border p-4 rounded-md">
                <h3 className="text-lg font-medium mb-4">연락처 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 전화번호 */}
                  <FormField
                    control={form.control}
                    name="contact.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>전화번호</FormLabel>
                        <FormControl>
                          <Input placeholder="010-1234-5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* 이메일 */}
                  <FormField
                    control={form.control}
                    name="contact.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이메일</FormLabel>
                        <FormControl>
                          <Input placeholder="example@mail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* 주소 */}
                  <FormField
                    control={form.control}
                    name="contact.address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>주소</FormLabel>
                        <FormControl>
                          <Input placeholder="서울시 강남구..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* 비상연락처 */}
                  <FormField
                    control={form.control}
                    name="contact.emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>비상연락처</FormLabel>
                        <FormControl>
                          <Input placeholder="010-9876-5432 (부모)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* 건강 및 기타 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 건강상태 */}
                <FormField
                  control={form.control}
                  name="healthStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>건강상태</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="건강상태 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {healthStatusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 정신건강 위험도 */}
                <FormField
                  control={form.control}
                  name="mentalHealthRisk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정신건강 위험도</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="위험도 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mentalHealthRiskOptions.map((risk) => (
                            <SelectItem key={risk} value={risk}>
                              {risk}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 학력 */}
                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>학력</FormLabel>
                      <FormControl>
                        <Input placeholder="고졸/대학교/대학원..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* 운전 숙련도 */}
                <FormField
                  control={form.control}
                  name="drivingSkill"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>운전 숙련도</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="운전 숙련도 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {drivingSkillOptions.map((skill) => (
                            <SelectItem key={skill} value={skill}>
                              {skill}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* 특기 */}
              <FormField
                control={form.control}
                name="specialSkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>특기</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="자격증, 기술 등 (쉼표로 구분)" 
                        value={field.value?.join(", ") || ""}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(
                            value ? value.split(",").map(skill => skill.trim()) : []
                          )
                        }}
                      />
                    </FormControl>
                    <FormDescription>쉼표(,)로 구분하여 여러 특기를 입력할 수 있습니다.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 비고 */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비고</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="추가 정보나 참고사항을 입력하세요."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/soldiers/${id}`)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  저장
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default EditSoldierPage 