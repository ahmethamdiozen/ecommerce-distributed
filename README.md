[🇬🇧 English](README.EN.md)

# Dağıtık E-Ticaret Platformu

TypeScript ile yazılmış, mikroservis tabanlı bir e-ticaret sistemi. Servisler birbirinden bağımsız çalışır; aralarındaki iletişim Kafka ve RabbitMQ üzerinden event'lerle sağlanır. Sistem; dağıtık kilitleme, idempotency, hız sınırlama, retry/DLQ ve Prometheus ile izleme gibi üretim ortamlarında sık kullanılan örüntüleri içerir.

## Mimari

```
                         ┌─────────────────┐
                         │    Frontend      │
                         │  React + Nginx   │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
     ┌────────▼────────┐ ┌───────▼───────┐ ┌─────────▼────────┐
     │  Auth Servisi    │ │ Sipariş Serv. │ │ Envanter Servisi  │
     │   (Port 3001)    │ │  (Port 3000)  │ │   (Port 3002)     │
     └──┬──────────┬────┘ └──┬─────┬──┬──┘ └──┬───┬────┬───┬──┘
        │          │         │     │  │        │   │    │   │
     Postgres    Redis    Redis  Kafka RMQ  Postgres Redis MinIO
                                  │     │              │
                                  ▼     ▼         Kafka│
                           ┌──────────────┐            │
                           │ Bildirim     │◄───────────┘
                           │   Servisi    │
                           └──────────────┘

            İzleme: Prometheus (9090) + Grafana (3004)
```

## Servisler

### Auth Servisi — Port 3001

Kullanıcı kaydı, giriş, token yenileme ve oturum iptali işlemlerini yönetir. Kimlik doğrulama iki token üzerinden çalışır: 15 dakika geçerli access token ve 7 gün geçerli refresh token. Refresh token'lar PostgreSQL'de saklanır; bu sayede belirli bir oturumu veritabanından silerek geçersiz kılmak mümkündür.

Şifreler bcrypt (10 salt round) ile hashlenir. `.env` dosyasındaki `ADMIN_EMAILS` listesinde yer alan e-posta adresleriyle kaydolan kullanıcılar otomatik olarak `admin` rolü alır.

**Endpoint'ler:**

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/auth/register` | Yeni kullanıcı oluşturur; admin rolü için `ADMIN_EMAILS` kontrolü yapılır |
| POST | `/auth/login` | E-posta ve şifre doğrular; access + refresh token döner |
| POST | `/auth/refresh` | Geçerli refresh token ile yeni access token üretir |
| POST | `/auth/logout` | Refresh token'ı veritabanından siler |
| GET | `/health` | Servis sağlık kontrolü |
| GET | `/metrics` | Prometheus metrikleri |

**Hız Sınırlama:** IP + e-posta çifti bazında, 60 saniyede 5 deneme. Redis üzerinde kayan pencere (sliding window) sayacı kullanılır.

---

### Sipariş Servisi — Port 3000

Siparişlerin oluşturulması ve listelenmesi bu serviste gerçekleşir. Bir sipariş oluşturulduğunda Kafka'ya `order-created` event'i, RabbitMQ'ya ise `ORDER_CONFIRMATION` mesajı yayınlanır.

Stok güncelleme işlemleri bir anda yalnızca bir siparişin aynı ürünü işleyebileceği şekilde Redis kilitleriyle korunur. Birden fazla ürünün aynı siparişte olduğu durumlarda kilitlenme (deadlock) oluşmaması için ürünler `productId`'ye göre sıralanarak kilitler bu sırayla alınır.

**Endpoint'ler:**

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/orders` | Sipariş oluşturur `[{productId, quantity}, ...]` |
| GET | `/orders` | Kullanıcının siparişlerini listeler |
| GET | `/stock/:productId` | Ürünün mevcut stok miktarını döner |
| GET | `/health` | Servis sağlık kontrolü |
| GET | `/metrics` | Prometheus metrikleri |

**Hız Sınırlama:** JWT'den alınan `userId` bazında, 60 saniyede 10 istek. Yanıt header'larına `X-RateLimit-Limit`, `X-RateLimit-Remaining` ve `X-RateLimit-Reset` eklenir.

**Dağıtık Kilitleme:** Her ürün için `lock:product:{productId}` anahtarıyla Redis'te 5 saniyelik TTL'li kilit oluşturulur. Kilit değeri olarak `orderId` kullanılır; böylece kilidi serbest bırakırken yalnızca sahibi olan sipariş bunu yapabilir.

**Idempotency:** Her sipariş başlamadan önce `idempotency:{orderId}` anahtarı Redis'te aranır. Anahtar mevcutsa işlem tekrar yürütülmez; `"already processed"` yanıtı döner. Başarılı siparişler bu anahtarla 24 saat boyunca Redis'te tutulur.

---

### Envanter Servisi — Port 3002

Ürün kataloğunu yönetir ve Kafka'dan gelen sipariş event'lerini tüketir. Ürünlere ait görseller MinIO'ya yüklenir; görsel URL'leri doğrudan erişime açık şekilde `imageUrl` alanında saklanır.

Admins ürün oluşturabilir, güncelleyebilir ve silebilir. Stok miktarı hem PostgreSQL'de hem de Redis'te tutulur; Redis üzerindeki `stock:{productId}` anahtarı sipariş servisi tarafından da okunur.

Kafka tüketicisi, `order-created` event'lerini dinler ve bu event'leri PostgreSQL'deki `order_events` tablosuna yazar. Bu tablo doğrudan sipariş kaydı değil; hangi siparişlerin hangi ürünleri etkilediğinin denetim kaydıdır.

**Endpoint'ler:**

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/products` | Tüm ürünleri listeler; `?tag=` ve `?search=` parametreleri desteklenir |
| GET | `/products/:id` | Tek ürün getirir |
| POST | `/products` | Ürün oluşturur (admin, multipart/form-data ile görsel kabul eder) |
| PUT | `/products/:id` | Ürün günceller (admin) |
| DELETE | `/products/:id` | Ürün siler (admin) |
| GET | `/health` | Servis sağlık kontrolü |
| GET | `/metrics` | Prometheus metrikleri |

---

### Bildirim Servisi — Port 3003

RabbitMQ'daki `notification-queue` kuyruğundan mesaj tüketir ve e-posta gönderimini simüle eder. Simülasyon kasıtlı olarak %40 başarısızlık oranına sahip olacak şekilde yazılmıştır; bu sayede retry ve DLQ mekanizması test edilebilir.

**Retry Akışı:**

```
notification-queue (ana kuyruk)
  ↓  başarısız olursa
notification-retry (TTL'li bekleme kuyruğu: 5s → 10s → 20s)
  ↓  TTL sona erince
notification-queue (yeniden denenecek)
  ↓  3 denemeden sonra hâlâ başarısız
notification-dlq (dead letter queue)
```

Mesaj başlıklarındaki `x-retry-count` değeri kaç kez denendiğini takip eder. 3 deneme aşıldıktan sonra mesaj DLQ'ya yönlendirilir ve burada loglama yapılır. `channel.prefetch(1)` sayesinde tüketici aynı anda yalnızca bir mesaj işler; bu da beklenmedik eş zamanlı işlem sorunlarını engeller.

---

### Frontend — Port 5173

React 19 + Vite ile yazılmış SPA. Nginx üzerinde çalışır (production build).

**Sayfalar:**

| Sayfa | Yol | Erişim |
|---|---|---|
| Giriş / Kayıt | `/login` | Herkese açık |
| Mağaza | `/` | Herkese açık |
| Ürün Detayı | `/product/:id` | Herkese açık |
| Sepet | `/cart` | Herkese açık |
| Ödeme | `/checkout` | Giriş yapılmış kullanıcı |
| Admin Paneli | `/admin` | Yalnızca admin rolü |

Axios interceptor, her isteğe otomatik olarak JWT bearer token ekler. 401 yanıtı alındığında refresh token akışını tetikler; bu da başarısız olursa localStorage temizlenerek kullanıcı `/login` sayfasına yönlendirilir. Sepet ve token bilgileri localStorage'da saklanır.

---

## Teknoloji Yığını

| Bileşen | Teknoloji |
|---|---|
| Dil | TypeScript (Node.js) |
| Framework | Express.js v5 |
| ORM | Prisma |
| Veritabanı | PostgreSQL 16 |
| Önbellek | Redis 7.2 |
| Olay akışı | Apache Kafka (Confluent 7.5) |
| Mesaj kuyruğu | RabbitMQ 3.12 |
| Nesne depolama | MinIO (S3 uyumlu) |
| Frontend | React 19 + Vite |
| İzleme | Prometheus + Grafana |
| CI | GitHub Actions |

---

## Event Akışı

```
Kullanıcı sipariş verir
  → Sipariş Servisi: Redis kilidi alır, stok düşer
  → Kafka: order-created event'i yayınlanır
  → RabbitMQ: ORDER_CONFIRMATION mesajı yayınlanır
        ↓                              ↓
  Envanter Servisi              Bildirim Servisi
  (audit kaydı yazar)          (e-posta gönderir, başarısız
                                olursa retry → DLQ)
```

---

## Dayanıklılık Örüntüleri

**Dağıtık Kilitleme**
`SET key value NX PX 5000` komutuyla Redis'te atomik kilit alınır. Kilit değeri siparişin ID'sidir; serbest bırakma sırasında değer kontrol edilerek yalnızca kilidi alan tarafın bırakmasına izin verilir. Birden fazla ürün içeren siparişlerde ürünler `productId`'ye göre sıralanır; bu, tüm siparişlerin aynı sırayla kilit talep etmesini sağlayarak döngüsel kilitlenmeyi önler.

**Idempotency**
Sipariş oluşturulmadan önce `idempotency:{orderId}` anahtarı sorgulanır. Mevcutsa işlem tekrar yürütülmez. Başarılı siparişler 24 saat boyunca işaretlenir; bu süre zarfında aynı isteğin tekrar gelmesi durumunda veritabanına dokunulmaz.

**Hız Sınırlama**
Auth servisinde IP + e-posta bazında, sipariş servisinde `userId` bazında Redis kayan pencere sayacı çalışır. Limit aşıldığında 429 yanıtı ve `Retry-After` süresi döner.

**Dead Letter Queue**
Bildirim servisi, başarısız mesajları 3 kez üstel geri çekilmeyle (5s, 10s, 20s) yeniden dener. Üçüncü denemeden sonra da başarısız olan mesajlar DLQ'ya taşınır ve loglama yapılır.

---

## İzleme

Tüm servisler `/metrics` endpoint'inde Prometheus formatında metrik yayınlar. Prometheus her 15 saniyede bir bu endpoint'leri toplar (scrape eder).

**Önemli Metrikler:**

| Servis | Metrik | Açıklama |
|---|---|---|
| Auth | `auth_requests_total{action, status}` | register/login/refresh/logout başarı ve hata sayıları |
| Sipariş | `orders_total{status}` | success/failed/duplicate sipariş sayıları |
| Sipariş | `order_duration_seconds` | İşlem süre histogramı |
| Sipariş | `redis_locks_total{result}` | Kilit alımı başarı/başarısızlık oranı |
| Envanter | `product_operations_total{operation, status}` | CRUD işlemi sayıları |
| Bildirim | `notifications_total{status}` | success/failed/dead bildirim sayıları |

MinIO metrikleri de `/minio/v2/metrics/cluster` üzerinden toplanır.

---

## Kurulum

```bash
git clone https://github.com/ahmethamdiozen/ecommerce-distributed.git
cd ecommerce-distributed
cp infrastructure/.env.example infrastructure/.env
# .env dosyasını düzenleyip gizli değerleri girin
cd infrastructure && docker compose up --build

# Frontend (ayrı bir terminalde)
cd services/frontend && npm install && npm run dev
```

Docker Compose, Kafka, Zookeeper, Redis, RabbitMQ, PostgreSQL, MinIO, Prometheus ve Grafana'yı otomatik olarak başlatır. Servisler sağlık kontrollerini geçene kadar birbirini bekler.

### Ortam Değişkenleri

`infrastructure/.env.example` dosyasından kopyalayıp aşağıdaki değerleri doldurun:

```env
POSTGRES_PASSWORD=          # PostgreSQL şifresi
RABBITMQ_USER=              # RabbitMQ kullanıcı adı
RABBITMQ_PASS=              # RabbitMQ şifresi
JWT_ACCESS_SECRET=          # Access token imzalama anahtarı
JWT_REFRESH_SECRET=         # Refresh token imzalama anahtarı
GRAFANA_PASSWORD=           # Grafana admin şifresi
ADMIN_EMAILS=               # Virgülle ayrılmış admin e-posta adresleri
MINIO_ROOT_USER=            # MinIO root kullanıcı adı
MINIO_ROOT_PASSWORD=        # MinIO root şifresi
```

### Servis URL'leri

| Servis | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Sipariş Servisi | http://localhost:3000 |
| Auth Servisi | http://localhost:3001 |
| Envanter Servisi | http://localhost:3002 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3004 |
| RabbitMQ Yönetim | http://localhost:15672 |
| MinIO Konsolu | http://localhost:9001 |

---

## CI Pipeline

Her `main` dalına push'ta GitHub Actions dört iş çalıştırır:

1. **Tip Kontrolü** — 4 backend servis için paralel olarak `tsc --noEmit` çalıştırılır. Prisma schema varsa `prisma generate` da yapılır.
2. **Frontend** — ESLint kontrolü ve ardından `vite build` çalıştırılır.
3. **Docker Build** — Tip kontrolü ve frontend build geçince 5 Dockerfile katman önbelleğiyle build edilir; registry'e push yapılmaz.
4. **Compose Doğrulama** — Production compose dosyasının geçerli syntax içerdiği doğrulanır.

---
