"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Loader2, Search, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getOfficers, deleteOfficer } from "@/lib/api/officers";
import { Officer } from "@/types";

export default function OfficersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [officerToDelete, setOfficerToDelete] = useState<Officer | null>(null);
  const [isDeletingOfficer, setIsDeletingOfficer] = useState(false);

  // 간부 목록 불러오기
  const loadOfficers = async () => {
    setIsLoading(true);
    try {
      const response = await getOfficers();
      if (response.success && response.data) {
        setOfficers(response.data);
      } else {
        toast({
          title: "오류",
          description: response.error || "간부 목록을 불러올 수 없습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("간부 목록 로드 오류:", error);
      toast({
        title: "오류",
        description: "간부 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  // 간부 삭제 핸들러
  const handleDeleteOfficer = async () => {
    if (!officerToDelete) return;
    
    setIsDeletingOfficer(true);
    try {
      const response = await deleteOfficer(officerToDelete.id);
      
      if (response.success) {
        toast({
          title: "성공",
          description: "간부가 삭제되었습니다.",
        });
        await loadOfficers();
      } else {
        toast({
          title: "오류",
          description: response.error || "간부 삭제에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("간부 삭제 오류:", error);
      toast({
        title: "오류",
        description: "간부 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingOfficer(false);
      setIsDeleteDialogOpen(false);
      setOfficerToDelete(null);
    }
  };

  // 검색 필터링된 간부 목록
  const filteredOfficers = officers.filter(
    (officer) =>
      officer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.rank.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Excel 다운로드 (실제 구현은 추가 필요)
  const handleExcelDownload = () => {
    toast({
      title: "알림",
      description: "Excel 다운로드 기능은 현재 개발 중입니다.",
    });
  };

  // 상태에 따른 뱃지 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "재직":
        return "success";
      case "휴가":
        return "warning";
      case "출장":
        return "secondary";
      case "교육":
        return "secondary";
      default:
        return "default";
    }
  };

  // 휴가 상태 확인 헬퍼 함수
  const getLeaveStatus = (officer: Officer) => {
    if (officer.status === "휴가") {
      return (
        <Badge variant="warning">
          휴가중
        </Badge>
      );
    }
    return (
      <Badge variant={getStatusColor(officer.status)}>
        {officer.status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">간부 관리</h1>
          <p className="text-muted-foreground">간부 현황을 확인하고 관리합니다.</p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleExcelDownload}>
            <FileDown className="mr-2 h-4 w-4" />
            Excel 다운로드
          </Button>
          <Button onClick={() => router.push("/officers/new")}>
            <Plus className="mr-2 h-4 w-4" />
            간부 추가
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>간부 목록</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="검색..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">데이터를 불러오는 중...</span>
            </div>
          ) : filteredOfficers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {searchTerm ? "검색 결과가 없습니다." : "등록된 간부가 없습니다."}
            </div>
          ) : (
            <Table className="border">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">No.</TableHead>
                  <TableHead>계급</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>소속</TableHead>
                  <TableHead className="w-[100px]">직책</TableHead>
                  <TableHead className="w-[100px]">생년월일</TableHead>
                  <TableHead className="w-[120px]">연락처</TableHead>
                  <TableHead className="w-[100px]">상태</TableHead>
                  <TableHead className="w-[80px]">선탑자</TableHead>
                  <TableHead className="w-[80px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOfficers.map((officer, index) => (
                  <TableRow
                    key={officer.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/officers/${officer.id}`)}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{officer.rank}</TableCell>
                    <TableCell>{officer.name}</TableCell>
                    <TableCell>{officer.unit}</TableCell>
                    <TableCell>{officer.position}</TableCell>
                    <TableCell>{officer.birthDate || "-"}</TableCell>
                    <TableCell>{officer.contact}</TableCell>
                    <TableCell>{getLeaveStatus(officer)}</TableCell>
                    <TableCell>
                      <Badge variant={officer.available ? "success" : "outline"}>
                        {officer.available ? "가능" : "불가"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/officers/${officer.id}/edit`);
                            }}
                          >
                            편집
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOfficerToDelete(officer);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>간부 삭제</DialogTitle>
            <DialogDescription>
              {officerToDelete?.name} {officerToDelete?.rank}을(를) 정말 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingOfficer}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOfficer}
              disabled={isDeletingOfficer}
            >
              {isDeletingOfficer ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 