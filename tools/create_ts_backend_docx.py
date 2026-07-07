from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "typescript-backend-guide.docx"


def xml_text(text: str) -> str:
    return escape(text).replace("\n", "</w:t><w:br/><w:t>")


def para(text: str = "", style: str | None = None) -> str:
    ppr = f"<w:pPr><w:pStyle w:val=\"{style}\"/></w:pPr>" if style else ""
    return f"<w:p>{ppr}<w:r><w:t xml:space=\"preserve\">{xml_text(text)}</w:t></w:r></w:p>"


def bullet(text: str) -> str:
    return (
        "<w:p>"
        "<w:pPr><w:pStyle w:val=\"ListBullet\"/></w:pPr>"
        f"<w:r><w:t xml:space=\"preserve\">• {xml_text(text)}</w:t></w:r>"
        "</w:p>"
    )


def code_block(code: str) -> str:
    lines = code.strip("\n").splitlines()
    result: list[str] = []
    for line in lines:
        result.append(
            "<w:p>"
            "<w:pPr><w:pStyle w:val=\"Code\"/></w:pPr>"
            f"<w:r><w:rPr><w:rFonts w:ascii=\"Consolas\" w:hAnsi=\"Consolas\"/></w:rPr>"
            f"<w:t xml:space=\"preserve\">{xml_text(line)}</w:t></w:r>"
            "</w:p>"
        )
    return "".join(result)


def table(rows: list[list[str]]) -> str:
    body = [
        "<w:tbl>",
        "<w:tblPr><w:tblStyle w:val=\"TableGrid\"/><w:tblW w:w=\"0\" w:type=\"auto\"/></w:tblPr>",
    ]
    for row in rows:
        body.append("<w:tr>")
        for cell in row:
            body.append(
                "<w:tc>"
                "<w:tcPr><w:tcW w:w=\"3000\" w:type=\"dxa\"/></w:tcPr>"
                f"{para(cell)}"
                "</w:tc>"
            )
        body.append("</w:tr>")
    body.append("</w:tbl>")
    return "".join(body)


def build_document() -> str:
    parts: list[str] = []

    parts.append(para("TypeScript cần học cho backend hiện tại", "Title"))
    parts.append(para("Áp dụng cho repo: D:\\Learning-skill\\BigIn\\Trainning\\train_Bigin_SE"))
    parts.append(para("Phạm vi chính: apps/backend là backend JavaScript hiện tại; nuxt-nodejs-boilerplate/apps/backend là backend TypeScript mẫu để đối chiếu."))

    parts.append(para("1. Backend hiện tại đang ở trạng thái nào?", "Heading1"))
    parts.append(bullet("apps/backend đang là Node.js + Express + Prisma + JWT + bcrypt, phần lớn viết bằng JavaScript CommonJS: require/module.exports."))
    parts.append(bullet("Có một file TypeScript liên quan Prisma: apps/backend/prisma.config.ts, nhưng logic backend chính vẫn là .js."))
    parts.append(bullet("Backend TypeScript mẫu nằm ở nuxt-nodejs-boilerplate/apps/backend, dùng src/*.ts, tsconfig strict, tsx khi dev, tsc khi build."))
    parts.append(bullet("Nếu chuyển backend hiện tại sang TS, phần cần học nhất là typing cho Express request/response, DTO, service/repository, Prisma model, JWT payload và error handling."))

    parts.append(para("Những lỗi/điểm yếu JS hiện tại mà TypeScript sẽ giúp nhìn ra sớm", "Heading2"))
    parts.append(bullet("package.json đang start/dev bằng index.js, nhưng trong apps/backend hiện thấy app.js và server.js. Cần thống nhất entrypoint trước khi chuyển TS."))
    parts.append(bullet("app.js dùng require/module.exports, server.js dùng import. Khi sang TS nên chọn một kiểu module rõ ràng, thường là ESM với import/export."))
    parts.append(bullet("UserService.js export class UserService, nhưng UserController.js gọi UserService.getAllUser() như object đã khởi tạo. TS sẽ bắt lỗi kiểu này nếu khai báo type đúng."))
    parts.append(bullet("authorizeRoles(1) truyền number, nhưng middleware dùng allowedRoles.includes(...), tức allowedRoles nên là array hoặc hàm nên nhận rest params. TS sẽ bắt mismatch này."))
    parts.append(bullet("Prisma schema của users có field role enum admin/staff, nhưng một số code dùng role_id. TS + Prisma generated types sẽ báo sai field khi create/update."))
    parts.append(bullet("throw new Error('EMAIL_IN_USE') không tự tạo err.code. Controller đang check err.code nên sẽ không chạy như mong muốn nếu không dùng custom error."))

    parts.append(para("2. Khác biệt quan trọng giữa TypeScript và JavaScript", "Heading1"))
    parts.append(table([
        ["JavaScript hiện tại", "TypeScript cần hiểu"],
        ["Biến có thể nhận mọi kiểu.", "Biến/hàm/object có kiểu cụ thể: string, number, boolean, User, RegisterDto..."],
        ["req.body, req.params gần như any.", "Phải định nghĩa DTO hoặc validate bằng Zod để biết body có field gì."],
        ["Sai field Prisma chỉ lỗi lúc chạy.", "Prisma generated types có thể báo lỗi ngay lúc code nếu dùng sai field."],
        ["Class/object sai cách dùng vẫn chạy đến khi gặp lỗi.", "Interface/class type giúp phát hiện service/repository chưa khớp hợp đồng."],
        ["require/module.exports phổ biến.", "Nên dùng import/export; có import type để chỉ import type, không import runtime."],
        ["Không có bước compile.", "Có tsc --noEmit để typecheck, tsc build ra dist/*.js để chạy production."],
    ]))

    parts.append(para("3. Cú pháp TypeScript cần học theo thứ tự ưu tiên", "Heading1"))

    parts.append(para("3.1. Type annotation cơ bản", "Heading2"))
    parts.append(para("Dùng để nói rõ biến, tham số, return của hàm là kiểu gì."))
    parts.append(code_block("""
const port: number = Number(process.env.PORT || 3000)
const email: string = 'admin@example.com'
const isAdmin: boolean = true

function add(a: number, b: number): number {
  return a + b
}
"""))

    parts.append(para("3.2. Object type, type alias và interface", "Heading2"))
    parts.append(para("Dùng nhiều nhất cho user, DTO, JWT payload, response. Interface thường hợp với object/class contract; type alias linh hoạt hơn với union."))
    parts.append(code_block("""
interface RegisterDto {
  departmentId: number
  role: 'admin' | 'staff'
  name: string
  password: string
  email: string
  phone: string
}

type LoginDto = {
  email: string
  password: string
}
"""))

    parts.append(para("3.3. Optional, nullable và union", "Heading2"))
    parts.append(para("Cần phân biệt rõ undefined, null và nhiều kiểu có thể xảy ra."))
    parts.append(code_block("""
interface UpdateUserDto {
  name?: string        // có thể không gửi field này
  email?: string
  phone?: string
}

type ServiceResult<T> = { data: T } | { error: string }

async function findUser(id: number): Promise<User | null> {
  // null nghĩa là tìm không thấy
  return null
}
"""))

    parts.append(para("3.4. Array và generic", "Heading2"))
    parts.append(para("Generic là cú pháp T giúp tái sử dụng type. Backend TS mẫu dùng BaseService<TEntity, TCreateDto, TUpdateDto>."))
    parts.append(code_block("""
const users: User[] = []

interface Repository<T> {
  findAll(): Promise<T[]>
  findById(id: number): Promise<T | null>
}

class BaseService<T> {
  constructor(private repo: Repository<T>) {}

  getAll(): Promise<T[]> {
    return this.repo.findAll()
  }
}
"""))

    parts.append(para("3.5. Promise<T> và async/await", "Heading2"))
    parts.append(para("Hàm async luôn trả Promise. Ghi return type giúp controller/service rõ contract."))
    parts.append(code_block("""
async function login(dto: LoginDto): Promise<{ token: string; user: SafeUser }> {
  const user = await prisma.users.findFirst({ where: { email: dto.email } })
  if (!user) throw new AppError('INVALID_EMAIL', 401)
  return { token: '...', user: { id: user.id, email: user.email, name: user.name, role: user.role } }
}
"""))

    parts.append(para("3.6. Import/export và import type", "Heading2"))
    parts.append(para("Khi chuyển sang TS, nên bỏ require/module.exports và dùng import/export thống nhất. Với type-only import, dùng import type."))
    parts.append(code_block("""
import express, { type Request, type Response, type NextFunction } from 'express'
import { UserService } from '@/services/user.service.js'
import type { RegisterDto } from '@/models/user.model.js'

export async function handleRegister(req: Request, res: Response): Promise<void> {
  // ...
}
"""))
    parts.append(bullet("Nếu tsconfig dùng module/moduleResolution NodeNext như backend mẫu, import file nội bộ trong source TS thường viết đuôi .js: import app from './app.js'. TypeScript sẽ map sang .ts khi compile."))

    parts.append(para("3.7. Type cho Express controller/middleware", "Heading2"))
    parts.append(para("Đây là phần quan trọng nhất với backend hiện tại."))
    parts.append(code_block("""
import type { Request, Response, NextFunction, RequestHandler } from 'express'

type JwtUser = {
  sub: number
  email: string
  name: string
  role: 'admin' | 'staff'
  departmentId: number
}

interface AuthRequest extends Request {
  user?: JwtUser
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  // jwt.verify trả string | JwtPayload ở type mặc định, nên cần kiểm tra/cast cẩn thận
  req.user = { sub: 1, email: 'a@b.com', name: 'Admin', role: 'admin', departmentId: 1 }
  next()
}

export const authorizeRoles = (...allowedRoles: JwtUser['role'][]): RequestHandler => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
"""))
    parts.append(bullet("Trong app.js hiện tại đang gọi authorizeRoles(1). Nếu theo Prisma schema hiện tại thì nên là authorizeRoles('admin'), không phải 1. Nếu muốn dùng roleId số thì schema phải có role_id number và type phải đổi theo."))

    parts.append(para("3.8. Class, constructor, access modifier", "Heading2"))
    parts.append(para("Dùng cho service/repository. TS giúp ép dependency phải đúng interface."))
    parts.append(code_block("""
interface IUserRepository {
  findAll(): Promise<User[]>
  findById(id: number): Promise<User | null>
}

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getAllUser(): Promise<User[]> {
    return this.userRepository.findAll()
  }
}
"""))

    parts.append(para("3.9. Utility types: Partial, Pick, Omit", "Heading2"))
    parts.append(para("Dùng để tránh lặp type."))
    parts.append(code_block("""
type SafeUser = Omit<User, 'password'>
type UpdateUserDto = Partial<Pick<User, 'name' | 'email' | 'phone'>>
type LoginResponse = { token: string; user: SafeUser }
"""))

    parts.append(para("3.10. unknown trong catch và custom error", "Heading2"))
    parts.append(para("Trong TS strict, error trong catch nên xử lý như unknown. Với backend hiện tại, nên dùng AppError thay vì check err.code trên Error thường."))
    parts.append(code_block("""
class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message = code
  ) {
    super(message)
  }
}

try {
  throw new AppError('EMAIL_IN_USE', 400)
} catch (err: unknown) {
  if (err instanceof AppError) {
    // err.code và err.status an toàn
  }
}
"""))

    parts.append(para("4. TypeScript không thay thế validate runtime", "Heading1"))
    parts.append(para("TS chỉ kiểm tra lúc viết code/compile. Dữ liệu từ HTTP request, database, JWT, env vẫn là runtime data. Vì vậy backend mẫu dùng zod trong controller."))
    parts.append(code_block("""
import { z } from 'zod'

const registerSchema = z.object({
  departmentId: z.number().int(),
  role: z.enum(['admin', 'staff']),
  name: z.string().min(1),
  password: z.string().min(6),
  email: z.string().email(),
  phone: z.string().min(10).max(10)
})

type RegisterDto = z.infer<typeof registerSchema>

const parsed = registerSchema.safeParse(req.body)
if (!parsed.success) {
  res.status(400).json({ errors: parsed.error.flatten() })
  return
}

await AuthService.register(parsed.data)
"""))
    parts.append(bullet("Không nên chỉ viết req.body as RegisterDto rồi tin là dữ liệu đúng. as chỉ ép compiler im lặng, không kiểm tra runtime."))

    parts.append(para("5. Prisma với TypeScript trong backend này", "Heading1"))
    parts.append(para("Prisma generated client là nguồn type chính cho database. Khi migrate sang TS, ưu tiên dùng type Prisma sinh ra thay vì tự đoán field."))
    parts.append(code_block("""
import { PrismaClient } from './generated/prisma/index.js'
import type { users, users_role } from './generated/prisma/index.js'

const prisma = new PrismaClient()

type SafeUser = Omit<users, 'password'>

async function findByEmail(email: string): Promise<users | null> {
  return prisma.users.findUnique({ where: { email } })
}

async function createUser(dto: {
  departmentId: number
  role: users_role
  name: string
  password: string
  email: string
  phone: string
}): Promise<users> {
  return prisma.users.create({
    data: {
      department_id: dto.departmentId,
      role: dto.role,
      name: dto.name,
      password: dto.password,
      email: dto.email,
      phone: dto.phone
    }
  })
}
"""))
    parts.append(bullet("Theo schema hiện tại, users có field role enum admin/staff. Code đang dùng role_id sẽ không đúng nếu schema không đổi."))
    parts.append(bullet("Nếu bạn muốn dùng roleId number ở API, cần map roleId sang enum hoặc sửa schema/database cho thống nhất."))

    parts.append(para("6. tsconfig và script cần hiểu", "Heading1"))
    parts.append(para("Backend TS mẫu đang có cấu hình đáng học:"))
    parts.append(code_block("""
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
"""))
    parts.append(bullet("strict: bật kiểm tra type nghiêm túc. Nên bật khi học để thấy lỗi thật."))
    parts.append(bullet("rootDir/outDir: source TS ở src, build JS ra dist."))
    parts.append(bullet("tsx watch src/server.ts: chạy dev trực tiếp từ TS."))
    parts.append(bullet("tsc --noEmit: chỉ kiểm tra type, không xuất file. Rất hữu ích trước khi commit."))
    parts.append(bullet("tsc && tsc-alias: build production và xử lý alias @ nếu dùng paths."))

    parts.append(para("7. Lộ trình học/practice ngay trên backend hiện tại", "Heading1"))
    parts.append(bullet("Bước 1: Học type cơ bản, interface, optional, union, Promise<T>. Chuyển các DTO như RegisterDto, LoginDto, UpdateUserDto trước."))
    parts.append(bullet("Bước 2: Học Express types: Request, Response, NextFunction, RequestHandler. Chuyển AuthController và Auth middleware."))
    parts.append(bullet("Bước 3: Học import/export ESM. Thống nhất app.ts/server.ts, bỏ trộn require với import."))
    parts.append(bullet("Bước 4: Học Prisma generated types. Sửa mismatch role/role_id trước khi typecheck toàn bộ."))
    parts.append(bullet("Bước 5: Học custom error và unknown trong catch. Thay Error('EMAIL_IN_USE') bằng AppError có code/status."))
    parts.append(bullet("Bước 6: Học generic sau cùng. Chỉ cần khi bạn muốn tái sử dụng BaseService/BaseRepository như backend mẫu."))

    parts.append(para("8. Checklist khi chuyển từng file JS sang TS", "Heading1"))
    parts.append(bullet("Đổi .js thành .ts trong src riêng, không đổi lộn xộn từng file ở root nếu chưa có tsconfig."))
    parts.append(bullet("Thêm type cho tham số hàm public: controller, service, repository."))
    parts.append(bullet("Thêm return type cho async function: Promise<...>."))
    parts.append(bullet("Không dùng any nếu chưa cần. Nếu chưa biết dữ liệu, dùng unknown rồi narrow."))
    parts.append(bullet("Validate req.body bằng zod hoặc middleware trước khi đưa vào service."))
    parts.append(bullet("Dùng Prisma generated type cho database entity."))
    parts.append(bullet("Chạy typecheck thường xuyên: pnpm/npm run typecheck hoặc npx tsc --noEmit."))
    parts.append(bullet("Sau khi build, production chạy dist/server.js, không chạy source .ts trực tiếp."))

    parts.append(para("9. Cú pháp nên tránh khi mới học", "Heading1"))
    parts.append(bullet("Tránh any tràn lan: nó làm TS gần như mất tác dụng."))
    parts.append(bullet("Tránh ép kiểu bằng as RegisterDto cho req.body nếu chưa validate runtime."))
    parts.append(bullet("Tránh vừa CommonJS vừa ESM trong cùng backend."))
    parts.append(bullet("Tránh tự viết type database thủ công nếu Prisma đã sinh type."))
    parts.append(bullet("Tránh học generic quá sâu trước khi nắm Express + DTO + Prisma types."))

    parts.append(para("10. File nên đọc trong repo", "Heading1"))
    parts.append(bullet("apps/backend/app.js: Express app hiện tại, routes và middleware."))
    parts.append(bullet("apps/backend/controllers/AuthController.js: ví dụ controller cần DTO, Request/Response, AppError."))
    parts.append(bullet("apps/backend/middleware/Auth.js: ví dụ cần typed JWT payload và AuthRequest."))
    parts.append(bullet("apps/backend/prisma/schema.prisma: nguồn field thật của database."))
    parts.append(bullet("nuxt-nodejs-boilerplate/apps/backend/src/models/user.model.ts: ví dụ interface/DTO đơn giản."))
    parts.append(bullet("nuxt-nodejs-boilerplate/apps/backend/src/shared/base.service.ts: ví dụ generic service."))
    parts.append(bullet("nuxt-nodejs-boilerplate/apps/backend/src/shared/base.controller.ts: ví dụ Express controller typed + zod."))

    parts.append(para("Kết luận ngắn", "Heading1"))
    parts.append(para("Với backend này, bạn không cần học toàn bộ TypeScript ngay. Ưu tiên: interface/type cho DTO, Request/Response middleware, Promise<T>, import/export, custom error, Prisma generated types, và zod validation. Generic/base class học sau khi bạn đã chuyển được Auth/User flow sang TS chạy ổn."))

    body = "".join(parts)
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"""


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""


RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


DOCUMENT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
"""


STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="30"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:ind w:left="720" w:hanging="360"/>
    </w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Code">
    <w:name w:val="Code"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>
      <w:sz w:val="19"/>
    </w:rPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:basedOn w:val="TableNormal"/>
    <w:tblPr><w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    </w:tblBorders></w:tblPr>
  </w:style>
</w:styles>
"""


CORE = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>TypeScript cần học cho backend hiện tại</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-07-07T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-07-07T00:00:00Z</dcterms:modified>
</cp:coreProperties>
"""


APP = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>
"""


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUT, "w", compression=ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", CONTENT_TYPES)
        docx.writestr("_rels/.rels", RELS)
        docx.writestr("word/_rels/document.xml.rels", DOCUMENT_RELS)
        docx.writestr("word/document.xml", build_document())
        docx.writestr("word/styles.xml", STYLES)
        docx.writestr("docProps/core.xml", CORE)
        docx.writestr("docProps/app.xml", APP)
    print(OUT)


if __name__ == "__main__":
    main()
