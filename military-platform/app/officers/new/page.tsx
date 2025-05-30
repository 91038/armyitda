"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { addOfficer } from "@/lib/api/officers";
import { ArrowLeft, Loader2 } from "lucide-react";

const officerFormSchema = z.object({
  name: z.string().min(1, "이름은 필수 입력 항목입니다."),
  rank: z.string().min(1, "계급은 필수 입력 항목입니다."),
  unit: z.string().min(1, "소속은 필수 입력 항목입니다."),
  position: z.string().min(1, "직책은 필수 입력 항목입니다."),
  contact: z.string().min(1, "연락처는 필수 입력 항목입니다."),
  birthDate: z.string().optional(),
  status: z.enum(["재직", "휴가", "출장", "교육"], {
    required_error: "상태는 필수 선택 항목입니다.",
  }),
  available: z.boolean().default(true),
  notes: z.string().optional(),
});

type OfficerFormValues = z.infer<typeof officerFormSchema>;

export default function AddOfficerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OfficerFormValues>({
    resolver: zodResolver(officerFormSchema),
    defaultValues: {
      name: "",
      rank: "",
      unit: "",
      position: "",
      contact: "",
      birthDate: "",
      status: "재직",
      available: true,
      notes: "",
    },
  });

  async function onSubmit(data: OfficerFormValues) {
    setIsSubmitting(true);
    try {
      const response = await addOfficer(data);
      
      if (response.success) {
        toast({
          title: "성공",
          description: "간부가 추가되었습니다.",
        });
        router.push("/officers");
      } else {
        toast({
          title: "오류",
          description: response.error || "간부 추가에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("간부 추가 오류:", error);
      toast({
        title: "오류",
        description: "간부 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="gap-1 mb-4"
          onClick={() => router.push("/officers")}
        >
          <ArrowLeft className="h-4 w-4" />
          간부 목록으로 돌아가기
        </Button>
        <h1 className="text-2xl font-bold">새 간부 추가</h1>
        <p className="text-muted-foreground">새로운 간부 정보를 입력해주세요.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>간부 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름 *</FormLabel>
                      <FormControl>
                        <Input placeholder="이름을 입력하세요" {...field} />
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
                      <FormLabel>계급 *</FormLabel>
                      <FormControl>
                        <Input placeholder="계급을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>소속 *</FormLabel>
                      <FormControl>
                        <Input placeholder="소속을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>직책 *</FormLabel>
                      <FormControl>
                        <Input placeholder="직책을 입력하세요" {...field} />
                      </FormControl>
                      <FormDescription>장교의 직책을 입력하세요</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>연락처 *</FormLabel>
                      <FormControl>
                        <Input placeholder="연락처를 입력하세요 (예: 010-1234-5678)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>생년월일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>장교의 생년월일을 입력하세요</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상태 *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="상태를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="재직">재직</SelectItem>
                          <SelectItem value="휴가">휴가</SelectItem>
                          <SelectItem value="출장">출장</SelectItem>
                          <SelectItem value="교육">교육</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비고</FormLabel>
                    <FormControl>
                      <Input placeholder="추가 정보가 있다면 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="available"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>선탑 가용</FormLabel>
                      <FormDescription>
                        이 간부를 차량 선탑자로 지정할 수 있습니다.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/officers")}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    "저장"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 