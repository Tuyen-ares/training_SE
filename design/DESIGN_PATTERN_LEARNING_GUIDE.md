# Học Design Pattern từ con số 0: nhìn đúng vấn đề trước khi chọn pattern

Tài liệu này dành cho người mới đã biết TypeScript/JavaScript cơ bản nhưng chưa biết:

- Khi nào một project thật sự cần design pattern.
- Nên chọn pattern nào.
- Làm sao nhìn được kiến trúc tổng thể.
- Làm sao tránh code lặp nhưng không tạo ra abstraction quá phức tạp.

> Ý quan trọng nhất: không chọn pattern dựa trên tên project. Chọn pattern dựa trên vấn đề, loại thay đổi và dependency mà project đang có.

Một website bán hàng không mặc định phải dùng Strategy, Factory hay Observer. Chỉ khi nó có nhiều cách thanh toán, nhiều cách tạo object hoặc nhiều bên cần phản ứng với một sự kiện thì các pattern tương ứng mới bắt đầu có giá trị.

---

## 1. Design pattern thực sự là gì?

Design pattern là một cách tổ chức object và dependency đã được sử dụng nhiều lần để giải quyết một nhóm vấn đề thiết kế thường gặp.

Pattern không phải:

- Đoạn code có thể copy nguyên xi.
- Framework hoặc thư viện.
- Quy tắc bắt buộc cho mọi project.
- Càng dùng nhiều càng chứng minh code tốt.
- Thuốc chữa code đang được đặt tên hoặc chia file chưa tốt.

Ví dụ, Strategy không có nghĩa là luôn phải tạo `PaymentStrategy`. Nó mô tả ý tưởng:

> Đưa các thuật toán có thể thay thế cho nhau ra sau cùng một contract, để code sử dụng không phụ thuộc vào từng thuật toán cụ thể.

Pattern là tên gọi chung giúp đội ngũ giao tiếp nhanh hơn:

```text
"Đoạn này dùng Strategy"

ngắn hơn:

"Chúng ta tách từng thuật toán thành object riêng, cho chúng cùng implement
một interface rồi truyền implementation cần dùng vào service..."
```

---

## 2. Bức tranh tổng thể cần nhìn

Khi thiết kế phần mềm, hãy nhìn theo thứ tự từ lớn đến nhỏ:

```text
Nhu cầu người dùng
    ↓
Use case / nghiệp vụ
    ↓
Ranh giới module
    ↓
Kiến trúc và hướng dependency
    ↓
Design pattern tại những điểm có biến động
    ↓
Class, function và code cụ thể
```

Ba cấp độ thường bị nhầm lẫn:

| Cấp độ | Câu hỏi | Ví dụ |
|---|---|---|
| Architecture | Toàn hệ thống được chia và giao tiếp thế nào? | Layered Architecture, Hexagonal, Modular Monolith |
| Design pattern | Một nhóm object phối hợp thế nào? | Strategy, Adapter, Repository, Observer |
| Coding idiom | Viết một đoạn code trong ngôn ngữ thế nào? | `async/await`, optional chaining, immutable update |

Repository Pattern không quyết định toàn bộ kiến trúc. Nó chỉ giải quyết ranh giới giữa nghiệp vụ và cơ chế lưu dữ liệu.

---

## 3. Kiến thức nền cần nắm trước

Không cần học hết OOP hàn lâm. Tuy nhiên, cần hiểu chắc các khái niệm sau.

### 3.1 Responsibility — trách nhiệm

Mỗi module nên có một lý do rõ ràng để thay đổi.

Ví dụ:

- Controller thay đổi khi HTTP contract thay đổi.
- Service thay đổi khi nghiệp vụ thay đổi.
- Repository thay đổi khi cách truy cập dữ liệu thay đổi.

Nếu một class vừa parse HTTP request, vừa tính giá, vừa gọi database, vừa gửi email thì nó đang có quá nhiều lý do để thay đổi.

### 3.2 Coupling — mức phụ thuộc

Coupling cho biết một module biết và phụ thuộc bao nhiêu vào module khác.

Coupling cao:

```ts
class OrderService {
  async checkout() {
    const prisma = new PrismaClient()
    const stripe = new Stripe('secret-key')
    // Nghiệp vụ bị gắn trực tiếp với Prisma và Stripe.
  }
}
```

Coupling thấp hơn:

```ts
interface OrderRepository {
  save(order: Order): Promise<void>
}

interface PaymentGateway {
  charge(amount: number): Promise<void>
}

class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway
  ) {}
}
```

Coupling không thể và không cần bằng 0. Mục tiêu là dependency ổn định, rõ ràng và có chủ đích.

### 3.3 Cohesion — mức gắn kết

Một module có cohesion cao khi những thứ bên trong cùng phục vụ một mục đích.

Ví dụ `UserRepository` chứa query liên quan đến User là hợp lý. Nếu nó chứa cả gửi email, format HTTP response và tính phí giao hàng thì cohesion thấp.

Quy tắc thực dụng:

> Những thứ thay đổi cùng nhau nên ở gần nhau. Những thứ thay đổi vì lý do khác nhau nên được tách ra.

### 3.4 Abstraction và interface

Interface mô tả điều phía sử dụng cần, không mô tả toàn bộ khả năng của implementation.

```ts
interface UserReader {
  findById(id: string): Promise<User | null>
}
```

Không tạo interface chỉ vì “best practice”. Interface có giá trị khi:

- Có hoặc dự kiến hợp lý sẽ có nhiều implementation.
- Cần test consumer độc lập với infrastructure.
- Cần bảo vệ nghiệp vụ khỏi thư viện bên ngoài.
- Contract giúp làm rõ ranh giới module.

### 3.5 Composition thay cho inheritance

Inheritance diễn tả quan hệ “là một”:

```text
MockUserRepository là một BaseMockRepository
```

Composition diễn tả quan hệ “sử dụng”:

```text
UserService sử dụng IUserRepository
```

Ưu tiên composition vì dễ thay thế từng hành vi và ít tạo cây kế thừa cứng nhắc. Chỉ dùng inheritance khi quan hệ thật sự ổn định và subclass tuân thủ contract của base class.

### 3.6 Dependency direction

Code nghiệp vụ nên phụ thuộc vào contract do ứng dụng kiểm soát, không phụ thuộc trực tiếp vào chi tiết bên ngoài.

```text
Sai hướng:
Business logic → Stripe SDK cụ thể

Tốt hơn:
Business logic → PaymentGateway interface ← Stripe adapter
```

Đây là nền tảng của Dependency Inversion và nhiều kiến trúc như Hexagonal/Clean Architecture.

### 3.7 Testing

Nếu không hiểu test, rất khó cảm nhận giá trị thật của dependency injection và interface.

Ví dụ:

```ts
const fakePayments: PaymentGateway = {
  charge: async () => {}
}

const service = new OrderService(fakeOrders, fakePayments)
```

Ta test nghiệp vụ mà không gọi Stripe hoặc database thật.

---

## 4. Không bắt đầu bằng “project này cần pattern gì?”

Hãy bắt đầu bằng bốn câu hỏi:

1. Phần nào thường xuyên thay đổi?
2. Phần nào có nhiều biến thể?
3. Dependency bên ngoài nào cần cô lập?
4. Đoạn code nào đang gây đau: lặp, khó test, nhiều `if/else`, sửa một chỗ hỏng nhiều chỗ?

Ví dụ với website bán hàng:

| Vấn đề quan sát được | Pattern có thể phù hợp |
|---|---|
| Có Stripe, PayPal, COD và thường thêm phương thức mới | Strategy + Adapter |
| Tạo notification khác nhau theo loại sự kiện | Factory |
| Sau khi đặt hàng, nhiều module cần phản ứng | Observer/Event |
| Trạng thái order có luật chuyển trạng thái phức tạp | State |
| Cần đổi Prisma sang datasource khác hoặc test không dùng DB | Repository |
| Cần thêm retry/log/cache quanh một gateway | Decorator |

Nếu project chỉ có một cách thanh toán cố định thì một function đơn giản thường tốt hơn Strategy.

---

## 5. Quy trình chọn pattern

### Bước 1: Viết use case bằng ngôn ngữ nghiệp vụ

Ví dụ:

```text
Khách đặt hàng.
Hệ thống kiểm tra tồn kho.
Hệ thống thanh toán.
Nếu thành công, lưu đơn hàng và gửi xác nhận.
```

Chưa cần nghĩ đến class hoặc pattern.

### Bước 2: Xác định dependency và điểm biến động

```text
- Database có thể thay đổi hoặc cần fake khi test.
- Nhà cung cấp thanh toán có nhiều loại.
- Email là dịch vụ bên ngoài.
- Sau khi đặt hàng có thể cần thêm analytics và loyalty point.
```

### Bước 3: Viết cách đơn giản nhất

Không thêm abstraction khi chưa thấy vấn đề:

```ts
async function checkout(order: Order) {
  await chargeWithStripe(order.total)
  await saveOrder(order)
  await sendEmail(order.customerEmail)
}
```

### Bước 4: Quan sát lý do phải sửa

Khi thêm PayPal, function có thể xuất hiện:

```ts
if (paymentType === 'stripe') {
  // ...
} else if (paymentType === 'paypal') {
  // ...
} else if (paymentType === 'cod') {
  // ...
}
```

Nếu nhánh tiếp tục tăng và từng nhánh có logic đáng kể, đây là tín hiệu Strategy.

### Bước 5: Tách đúng phần biến động

```ts
interface PaymentMethod {
  pay(amount: number): Promise<void>
}

class CheckoutService {
  constructor(private readonly payment: PaymentMethod) {}

  async checkout(order: Order): Promise<void> {
    await this.payment.pay(order.total)
  }
}
```

### Bước 6: Kiểm tra abstraction có đáng giá không

Hỏi:

- Thêm biến thể mới có giảm sửa code cũ không?
- Unit test có dễ hơn không?
- Người mới đọc có hiểu luồng không?
- Interface có ổn định hơn implementation không?
- Số file và class tăng lên có tương xứng với lợi ích không?

Nếu câu trả lời phần lớn là “không”, abstraction có thể đang quá sớm.

---

## 6. Các pattern nên học trước

Không cần học 23 GoF pattern cùng lúc. Với backend TypeScript, nên học theo thứ tự sau.

### 6.1 Dependency Injection

#### Vấn đề

Class tự tạo dependency nên khó thay thế và khó test.

```ts
class UserService {
  private readonly repo = new PrismaUserRepository()
}
```

#### Giải pháp

Truyền dependency từ bên ngoài:

```ts
class UserService {
  constructor(private readonly repo: UserRepository) {}
}
```

Nơi lắp object:

```ts
const repo = new PrismaUserRepository(prisma)
const service = new UserService(repo)
```

#### Dùng khi

- Có dependency như database, payment, filesystem hoặc HTTP client.
- Muốn unit test độc lập.
- Muốn thay implementation theo môi trường.

#### Không cần khi

- Dependency chỉ là pure utility ổn định như `Math`.
- Việc inject làm code dài hơn nhưng không tạo khả năng thay thế có ích.

---

### 6.2 Repository

#### Vấn đề

Business logic bị trộn với query database:

```ts
class UserService {
  async register(dto: CreateUserDto) {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email }
    })
  }
}
```

#### Giải pháp

```ts
interface UserRepository {
  findByEmail(email: string): Promise<User | null>
  create(dto: CreateUserDto): Promise<User>
}
```

Infrastructure triển khai contract:

```ts
class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }
}
```

#### Dùng khi

- Domain logic cần độc lập với database.
- Query cần được gom theo aggregate/resource.
- Cần fake repository khi test.

#### Không nên hiểu sai

Không phải mỗi table bắt buộc có repository. Với ứng dụng CRUD rất nhỏ, ORM đã gần giống abstraction và thêm repository có thể chỉ tạo lớp forwarding không có giá trị.

---

### 6.3 Strategy

#### Vấn đề

Một nghiệp vụ có nhiều thuật toán thay thế:

```ts
if (shippingType === 'standard') {
  // ...
} else if (shippingType === 'express') {
  // ...
}
```

#### Giải pháp

```ts
interface ShippingFeePolicy {
  calculate(order: Order): number
}

class StandardShipping implements ShippingFeePolicy {
  calculate(order: Order): number {
    return order.total >= 500_000 ? 0 : 30_000
  }
}

class ExpressShipping implements ShippingFeePolicy {
  calculate(order: Order): number {
    return order.weight * 15_000
  }
}
```

#### Dùng khi

- Có nhiều thuật toán thật sự.
- Chúng thay đổi độc lập.
- Consumer không nên biết chi tiết từng thuật toán.

#### Không dùng khi

- Chỉ có một nhánh nhỏ và ổn định.
- Việc tách class làm logic bị phân tán khó đọc hơn.

---

### 6.4 Adapter

#### Vấn đề

API của thư viện bên ngoài không phù hợp với ngôn ngữ domain.

Stripe có thể trả về object phức tạp, nhưng ứng dụng chỉ cần:

```ts
interface PaymentGateway {
  charge(request: ChargeRequest): Promise<PaymentResult>
}
```

#### Giải pháp

```ts
class StripePaymentAdapter implements PaymentGateway {
  constructor(private readonly stripe: Stripe) {}

  async charge(request: ChargeRequest): Promise<PaymentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: request.amount,
      currency: request.currency
    })

    return {
      transactionId: intent.id,
      successful: intent.status === 'succeeded'
    }
  }
}
```

Adapter dịch giữa contract nội bộ và API bên ngoài.

#### Dùng khi

- Tích hợp SDK/API bên thứ ba.
- Không muốn kiểu dữ liệu của vendor lan vào business logic.
- Muốn mock integration khi test.

---

### 6.5 Factory

#### Vấn đề

Logic khởi tạo object phức tạp hoặc phụ thuộc runtime.

```ts
function createPaymentMethod(type: PaymentType): PaymentMethod {
  switch (type) {
    case 'stripe':
      return new StripePayment(...)
    case 'paypal':
      return new PaypalPayment(...)
    case 'cod':
      return new CashOnDelivery()
  }
}
```

Factory gom quyết định khởi tạo vào một nơi.

#### Dùng khi

- Consumer không nên biết constructor cụ thể.
- Cách khởi tạo có nhiều dependency.
- Loại implementation được chọn ở runtime.

#### Chú ý

Factory không loại bỏ hoàn toàn `switch`. Nó đặt `switch` tại đúng nơi chịu trách nhiệm tạo object.

---

### 6.6 Decorator

#### Vấn đề

Cần bổ sung hành vi quanh một dependency mà không sửa implementation gốc.

```ts
class CachedUserRepository implements UserRepository {
  constructor(
    private readonly inner: UserRepository,
    private readonly cache: Cache
  ) {}

  async findById(id: string): Promise<User | null> {
    const cached = await this.cache.get<User>(id)
    if (cached) return cached

    const user = await this.inner.findById(id)
    if (user) await this.cache.set(id, user)
    return user
  }
}
```

Có thể bọc tiếp:

```text
LoggingRepository(
  CachedRepository(
    PrismaRepository
  )
)
```

#### Dùng khi

- Thêm cache, logging, retry, metrics hoặc authorization.
- Muốn giữ nguyên contract.
- Hành vi bổ sung có thể kết hợp theo lớp.

---

### 6.7 Observer / Domain Event

#### Vấn đề

Sau một hành động, nhiều module cần phản ứng:

```text
OrderCreated
├── gửi email
├── trừ tồn kho
├── cộng điểm
└── ghi analytics
```

Nếu `OrderService` gọi trực tiếp mọi module, nó sẽ biết quá nhiều dependency.

#### Giải pháp khái niệm

```ts
interface DomainEvent {
  name: string
}

interface EventBus {
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>
}
```

Service phát event:

```ts
await eventBus.publish({
  name: 'OrderCreated',
  orderId: order.id
})
```

Các handler đăng ký phản ứng.

#### Dùng khi

- Một sự kiện có nhiều subscriber.
- Subscriber thay đổi độc lập.
- Không muốn source module phụ thuộc trực tiếp vào tất cả consumer.

#### Rủi ro

- Luồng xử lý khó nhìn hơn vì không còn gọi trực tiếp.
- Xử lý bất đồng bộ cần retry, idempotency và quan sát lỗi.
- Không nên dùng event chỉ để tránh một lời gọi function đơn giản.

---

### 6.8 State

#### Vấn đề

Hành vi phụ thuộc mạnh vào trạng thái hiện tại:

```text
pending → paid → shipping → completed
             ↘ cancelled
```

Code thường xuất hiện nhiều điều kiện:

```ts
if (order.status === 'paid' && action === 'ship') {
  // ...
}
```

State Pattern đưa hành vi của từng trạng thái vào object riêng. Tuy nhiên, với workflow nhỏ, transition table hoặc function kiểm tra đơn giản thường dễ hiểu hơn.

Dùng State khi:

- Có nhiều trạng thái.
- Mỗi trạng thái cho phép hành động khác nhau.
- Luật chuyển trạng thái phức tạp và tiếp tục phát triển.

---

## 7. Nhóm pattern theo loại vấn đề

Tên nhóm chỉ giúp ghi nhớ, không phải quy trình chọn pattern.

### Creational — tạo object

| Pattern | Câu hỏi nó giải quyết |
|---|---|
| Factory Method | Ai quyết định class cụ thể được tạo? |
| Abstract Factory | Làm sao tạo cả họ object tương thích? |
| Builder | Làm sao tạo object có nhiều bước hoặc option? |
| Singleton | Làm sao chỉ có một instance dùng chung? |

Với backend, hãy đặc biệt cẩn thận với Singleton vì global state làm test khó và có thể giữ state ngoài ý muốn.

### Structural — ghép cấu trúc

| Pattern | Câu hỏi nó giải quyết |
|---|---|
| Adapter | Làm sao đổi interface A thành interface ứng dụng cần? |
| Decorator | Làm sao bọc thêm hành vi mà vẫn giữ contract? |
| Facade | Làm sao cung cấp API đơn giản trước subsystem phức tạp? |
| Proxy | Làm sao kiểm soát việc truy cập object thật? |

### Behavioral — phối hợp hành vi

| Pattern | Câu hỏi nó giải quyết |
|---|---|
| Strategy | Làm sao thay thuật toán tại runtime? |
| Observer | Làm sao nhiều bên phản ứng với một sự kiện? |
| Command | Làm sao đóng gói một yêu cầu thành object? |
| State | Làm sao đổi hành vi theo trạng thái? |
| Template Method | Làm sao giữ khung thuật toán và cho subclass thay vài bước? |

---

## 8. Phân tích backend hiện tại

Backend trong repository này có luồng:

```text
Express Router
    ↓
BaseController / UserController
    ↓
BaseService / UserService
    ↓
IUserRepository
    ↓
MockUserRepository
    ↓
In-memory array
```

### Pattern đang có

| Thành phần | Pattern/ý tưởng |
|---|---|
| `IUserRepository` | Repository contract |
| `MockUserRepository` | Repository implementation |
| `new UserService(repo)` | Dependency Injection |
| `BaseService` | Service Layer + inheritance |
| `BaseController` | Template Method gần đúng |
| `createRestRouter()` | Factory function |
| `user.routes.ts` | Composition Root |
| `ApiResponse` | Response utility/facade nhỏ |

### Tại sao cấu trúc này hợp lý cho việc học?

- Nhìn thấy rõ trách nhiệm từng tầng.
- Có thể thay mock repository bằng database repository.
- Có CRUD dùng chung để quan sát generic và inheritance.
- Có business rule email duy nhất trong service.
- Có validation HTTP nằm ở controller.

### Điểm cần hiểu đúng

Không phải project nào cũng cần đủ `controller → service → repository`.

Nếu một endpoint chỉ đọc health status:

```ts
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})
```

Tạo thêm `HealthController`, `HealthService`, `HealthRepository` sẽ không mang lại giá trị.

Layer chỉ đáng tồn tại khi nó có trách nhiệm thật, không phải để đạt đủ sơ đồ.

### Điểm có thể cải thiện khi project lớn hơn

1. `UserService.update()` cần kiểm tra email trùng.
2. Database thật cần unique constraint, không chỉ kiểm tra trong service.
3. Controller nên chuyển exception đến error middleware thay vì nuốt lỗi.
4. Nên dùng result type rõ ràng hoặc domain exception.
5. Có thể tách Zod schema khỏi controller nếu schema được tái sử dụng.
6. Khi use case phức tạp, nên ưu tiên service theo use case như `RegisterUser`, `ChangeUserEmail` thay vì một `UserService` ngày càng lớn.

---

## 9. Khi nào code lặp là xấu?

Không phải mọi duplication đều cần loại bỏ.

### Lặp cú pháp

Hai đoạn code trông giống nhau nhưng thuộc hai nghiệp vụ khác nhau:

```ts
discount = total * 0.1
tax = total * 0.1
```

Chúng giống cú pháp nhưng thay đổi vì lý do khác nhau. Gom thành một abstraction có thể làm chúng bị ràng buộc sai.

### Lặp kiến thức

Cùng một business rule được viết nhiều nơi:

```text
Phí giao hàng miễn phí khi đơn từ 500.000 đồng
```

Nếu rule xuất hiện ở controller, frontend và service, đây là duplication nguy hiểm vì khi rule đổi dễ sửa thiếu.

Mục tiêu chính của DRY là:

> Mỗi mẩu kiến thức hoặc quy tắc nghiệp vụ nên có một nguồn sự thật rõ ràng.

### Rule of Three

Một cách học an toàn:

1. Lần đầu: viết giải pháp đơn giản.
2. Lần hai: ghi nhận sự giống nhau.
3. Lần ba: nếu cùng thay đổi vì một lý do, mới cân nhắc abstraction.

Đây không phải luật tuyệt đối, nhưng giúp người mới tránh abstract quá sớm.

---

## 10. SOLID nên được hiểu thế nào?

### S — Single Responsibility

Một module nên có một lý do chính để thay đổi.

Không đồng nghĩa với “mỗi class chỉ có một method”.

### O — Open/Closed

Có thể thêm biến thể mới với ít sửa code ổn định.

Strategy hỗ trợ điều này khi thêm phương thức thanh toán mới.

Không cần làm mọi code “open for extension”. Chỉ bảo vệ các điểm thực sự biến động.

### L — Liskov Substitution

Implementation thay thế phải giữ lời hứa của contract.

Nếu `UserRepository.findById()` hứa trả `null` khi không tìm thấy, một implementation không nên bất ngờ throw exception “not found”.

### I — Interface Segregation

Consumer không nên phụ thuộc vào method nó không dùng.

```ts
interface UserReader {
  findById(id: string): Promise<User | null>
}

interface UserWriter {
  save(user: User): Promise<void>
}
```

Không nhất thiết phải chia interface ngay từ đầu. Chỉ chia khi consumer thật sự có nhu cầu khác nhau.

### D — Dependency Inversion

Business policy không phụ thuộc trực tiếp vào infrastructure detail.

```text
UserService → UserRepository interface ← PrismaUserRepository
```

---

## 11. Mẫu ra quyết định nhanh

Khi gặp một đoạn code khó mở rộng, dùng checklist:

### Nếu có nhiều `if/else`

Hỏi:

- Đây chỉ là validation hay thật sự là nhiều thuật toán?
- Các nhánh có phát triển độc lập không?
- Có thường thêm loại mới không?

Nếu có, xem xét Strategy hoặc State. Không tự động thay mọi `if` bằng polymorphism.

### Nếu class dùng `new` nhiều dependency

Hỏi:

- Nó đang làm nghiệp vụ hay đang lắp object?
- Dependency có cần fake hoặc thay implementation không?

Nếu có, chuyển việc khởi tạo về Composition Root và dùng Dependency Injection.

### Nếu SDK bên ngoài xuất hiện khắp domain

Dùng Adapter để cô lập kiểu dữ liệu và lỗi của vendor.

### Nếu một hành động gọi ngày càng nhiều module

Xem xét Observer/Domain Event, nhưng chỉ khi chấp nhận luồng xử lý gián tiếp.

### Nếu cần thêm cache/log/retry cho nhiều implementation

Xem xét Decorator hoặc middleware.

### Nếu constructor có quá nhiều tham số cấu hình

Xem xét parameter object hoặc Builder. Đừng dùng Builder chỉ để tạo object có ba field.

---

## 12. Pattern theo loại project

Đây là gợi ý khởi đầu, không phải công thức bắt buộc.

### CRUD admin nhỏ

Thường cần:

- Controller/router.
- Service nếu có nghiệp vụ.
- Repository nếu cần cô lập persistence hoặc test.
- Dependency Injection thủ công.

Chưa cần:

- Event bus.
- CQRS.
- State machine.
- Abstract Factory phức tạp.

### E-commerce

Có thể dần cần:

- Strategy cho pricing, promotion, shipping, payment.
- Adapter cho payment/shipping provider.
- State cho order lifecycle.
- Domain Event cho order created/paid/shipped.
- Repository cho aggregate như Order.

### Notification system

Có thể cần:

- Strategy cho email/SMS/push.
- Factory chọn channel.
- Template Method cho pipeline gửi chung.
- Decorator cho retry/rate limit/logging.
- Observer/Event để nhận sự kiện từ module khác.

### Hệ thống tích hợp nhiều API

Có thể cần:

- Adapter để chuẩn hóa API vendor.
- Facade để cung cấp API nội bộ đơn giản.
- Circuit Breaker và retry policy.
- Strategy để chọn provider.

### Workflow nhiều trạng thái

Có thể cần:

- State hoặc transition table.
- Command cho từng action.
- Event để ghi nhận thay đổi và kích hoạt side effect.

---

## 13. Cách phát triển kiến trúc theo độ phức tạp

Không xây kiến trúc cho quy mô chưa tồn tại.

### Giai đoạn 1 — đơn giản

```text
route → function → database
```

Phù hợp prototype hoặc endpoint nhỏ.

### Giai đoạn 2 — nghiệp vụ bắt đầu rõ

```text
controller → service → repository
```

Tách HTTP, business rule và persistence.

### Giai đoạn 3 — nhiều integration

```text
use case → ports/interfaces ← adapters
```

Domain được bảo vệ khỏi SDK bên ngoài.

### Giai đoạn 4 — module có side effect phức tạp

```text
use case → domain event → handlers
```

Email, analytics, loyalty có thể phát triển độc lập.

### Giai đoạn 5 — chỉ khi có nhu cầu thật

Có thể xem xét:

- Queue/message broker.
- CQRS.
- Event sourcing.
- Microservices.

Những giải pháp này tạo thêm chi phí vận hành, consistency và debugging. Không dùng chỉ vì project “trông chuyên nghiệp”.

---

## 14. Lộ trình học đề xuất

### Chặng 1 — nền tảng

Học và thực hành:

- Function, class, interface và generic TypeScript.
- Composition và inheritance.
- Coupling, cohesion và responsibility.
- Unit test với fake dependency.

Bài tập:

1. Viết `UserService` gọi trực tiếp array.
2. Tách array thành `UserRepository`.
3. Truyền repository qua constructor.
4. Test service bằng fake repository.

### Chặng 2 — pattern quan trọng nhất

Học theo thứ tự:

1. Dependency Injection.
2. Repository.
3. Strategy.
4. Adapter.
5. Factory.
6. Decorator.

Mỗi pattern cần trả lời được:

- Nó giải quyết vấn đề gì?
- Code trước pattern đau ở đâu?
- Trade-off là gì?
- Khi nào không nên dùng?

### Chặng 3 — hành vi và workflow

Học:

- Observer/Domain Event.
- State.
- Command.
- Template Method.

Thực hành bằng order lifecycle hoặc notification pipeline.

### Chặng 4 — kiến trúc

Sau khi hiểu dependency direction:

- Layered Architecture.
- Modular Monolith.
- Hexagonal Architecture.
- Clean Architecture.

Chưa cần học microservices trước khi hiểu cách chia module trong một process.

---

## 15. Bài tập trực tiếp trên boilerplate này

Làm theo thứ tự, không làm tất cả cùng lúc.

### Bài 1 — hiểu luồng hiện tại

Đặt breakpoint hoặc log theo thứ tự:

```text
user.routes
BaseController.create
UserService.create
MockUserRepository.findByEmail
BaseMockRepository.create
```

Gửi `POST /api/users` và ghi lại dữ liệu ở mỗi bước.

### Bài 2 — test Dependency Injection

Tạo fake `IUserRepository`, truyền vào `UserService`, rồi test:

- Email chưa tồn tại thì tạo thành công.
- Email đã tồn tại thì trả conflict.

Mục tiêu không phải coverage, mà là thấy service không cần Express hoặc database.

### Bài 3 — thêm database repository

Tạo:

```text
PrismaUserRepository implements IUserRepository
```

Không sửa `UserService`. Chỉ thay dependency trong composition root.

Nếu làm được, bạn đã hiểu giá trị của Repository và Dependency Injection.

### Bài 4 — sửa luật update email

Override `UserService.update()` để:

- Tìm user hiện tại.
- Nếu đổi email, kiểm tra email mới.
- Không coi email của chính user hiện tại là trùng.

Sau đó thêm unique constraint ở database để bảo vệ khỏi race condition.

### Bài 5 — Strategy

Thêm module tính phí giao hàng:

```text
StandardShipping
ExpressShipping
PickupShipping
```

Cho chúng implement cùng `ShippingFeePolicy`.

### Bài 6 — Adapter

Giả lập hai payment provider trả response khác nhau. Viết adapter để cả hai cùng trả:

```ts
type PaymentResult = {
  transactionId: string
  successful: boolean
}
```

### Bài 7 — Event

Sau khi tạo user:

```text
UserRegistered
├── SendWelcomeEmail
└── CreateAuditLog
```

Đầu tiên làm bằng lời gọi trực tiếp. Sau đó chuyển sang event và so sánh:

- Code nào dễ đọc hơn?
- Dependency nào giảm?
- Debug có khó hơn không?

---

## 16. Dấu hiệu đang lạm dụng pattern

- Mỗi class chỉ forward đúng một lời gọi sang class khác.
- Một feature nhỏ phải mở quá nhiều file mới hiểu được.
- Có interface nhưng chắc chắn chỉ một implementation và không có boundary cần bảo vệ.
- Dùng Factory để gọi một constructor đơn giản.
- Dùng Observer khiến không ai biết hành động nào xảy ra sau request.
- Dùng inheritance sâu nhiều tầng.
- Base class chứa hàng loạt `protected hook` cho mọi trường hợp.
- Tên class đầy pattern nhưng thiếu ngôn ngữ nghiệp vụ.
- Không thể giải thích vấn đề cụ thể mà pattern đang giải quyết.

Quy tắc kiểm tra:

> Nếu bỏ pattern đi mà code vẫn dễ thay đổi, dễ test và dễ đọc hơn, pattern đó không cần thiết.

---

## 17. Cách review một thiết kế

Trước khi kết luận kiến trúc “chuẩn”, hãy kiểm tra:

### Nghiệp vụ

- Use case có được thể hiện rõ không?
- Business rule nằm ở một nơi đáng tin cậy không?
- Tên class/method có dùng ngôn ngữ domain không?

### Dependency

- Business logic có import SDK/ORM/framework không cần thiết không?
- Dependency được tạo ở đâu?
- Có thể thay integration khi test không?

### Thay đổi

- Khi thêm một biến thể, phải sửa bao nhiêu nơi?
- Những module nào có khả năng thay đổi cùng nhau?
- Abstraction hiện tại bảo vệ loại thay đổi nào?

### Độ phức tạp

- Có lớp nào chỉ chuyển tiếp lời gọi không?
- Có thể thay class bằng function đơn giản không?
- Luồng request có dễ lần theo không?

### Tính đúng đắn

- Constraint quan trọng có được bảo vệ tại database không?
- Error có bị nuốt không?
- Side effect có retry/idempotency khi cần không?

Không có kiến trúc “chuẩn nhất” cho mọi hệ thống. Chỉ có thiết kế phù hợp hơn hoặc kém phù hợp hơn với yêu cầu, quy mô, đội ngũ và loại thay đổi dự kiến.

---

## 18. Template ghi chú khi học một pattern

Mỗi lần học pattern mới, ghi đúng mẫu này:

```md
# Tên pattern

## Vấn đề
Code gặp khó khăn cụ thể nào?

## Tín hiệu
Nhìn vào code sẽ thấy dấu hiệu gì?

## Giải pháp cốt lõi
Dependency/object được tổ chức lại thế nào?

## Trước và sau
Ví dụ code tối thiểu.

## Trade-off
Pattern làm tăng chi phí gì?

## Khi nên dùng
Điều kiện thực tế nào cần tồn tại?

## Khi không nên dùng
Giải pháp đơn giản nào tốt hơn?

## Bài tập
Tự refactor một ví dụ không nhìn đáp án.
```

Nếu chưa giải thích được phần “vấn đề” và “trade-off”, bạn chưa thật sự hiểu pattern đó.

---

## 19. Tóm tắt tư duy cốt lõi

1. Bắt đầu từ use case, không bắt đầu từ pattern.
2. Nhìn điểm biến động và hướng dependency.
3. Viết giải pháp đơn giản trước.
4. Chấp nhận một ít duplication trước khi hiểu đúng abstraction.
5. Dùng interface tại boundary có giá trị.
6. Ưu tiên composition và dependency injection.
7. Pattern phải giúp code dễ thay đổi, dễ test hoặc dễ hiểu hơn.
8. Mọi pattern đều có trade-off.
9. Không ép mọi endpoint qua đủ tầng nếu tầng đó không có trách nhiệm.
10. Học pattern bằng refactor code đang có vấn đề, không học bằng thuộc sơ đồ UML.

Câu hỏi tốt nhất không phải:

> Project này dùng design pattern nào?

Mà là:

> Phần nào của project có khả năng thay đổi, hiện đang phụ thuộc vào điều gì, và cách đơn giản nhất để cô lập sự thay đổi đó là gì?
