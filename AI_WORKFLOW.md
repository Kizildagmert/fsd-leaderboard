# AI Destekli Geliştirme İş Akışı

Bu projede AI (Claude Sonnet 4.6(Thinking) / Gemini / Antigravity IDE) ile "Pair Programming" yaklaşımını benimsedim. Baş mimar ve ürün yöneticisi rollerini ben üstlenirken, kod yazımı ve iskelet oluşturma işlerini yapay zekaya devrettim.

## Kullanılan Araçlar
- **Claude Sonnet 4.6(Thinking):** Backend mimarisinin planlanmasında, veritabanı ilişkilerinin kurgulanmasında ve sistem iskeletinin tasarlanmasında kullandım. Özellikle mimari kararların matematiksel ve mantıksal doğruluğunu test etmek için reasoning yeteneğinden yararlandım.
- **Gemini 3.1 Pro(high):** Kod üretimi, Vanilla CSS tasarımları ve terminal komutlarının çalıştırılması için kullandım. Claude Sonnet kotası dolduğunda Gemini'ye geçmek zorunda kaldım — bu geçişte bağlam kayıpları yaşandı ve bazı çıktıları (yanlış tema, hatalı metinler) bizzat müdahale ederek düzelttim.
- **Antigravity IDE:** VS Code üzerinde çalışan AI agent ortamı. Dosya yazma, terminal çalıştırma ve kod inceleme işlemlerini bu ortam üzerinden yönetim.

## AI'ın Yardımcı Olduğu Yerler
- **Boilerplate:** Node.js, Express ve React projelerinin TypeScript ile ayağa kaldırılması.
- **react-virtuoso entegrasyonu:** Büyük listede donma yaşanmaması için react-virtuoso sanal liste kütüphanesinin entegrasyonu
- **Pixel Art / Neon Gaming Arayüzü:** Belirlediğim "Pixel Art / Neon Gaming Arayüzü" temasına uygun Tailwind CSS, Vanilla CSS sınıflarının yazılması.
- **Seed Script:** 100.000 kullanıcının PostgreSQL'e batch insert ile, Redis ZSET'e pipeline ile yazılması.

## Benim Karar Aldığım ve Müdahale Ettiğim Yerler (Mimari ve Mantık)


1. **Ödül Dağıtım Formülü:** Case dosyasında 4. ile 100. sıralar arasındaki ödül dağıtımı tanımlanmış ama formül belirtilmemişti. Claude Sonnet'in reasoning yeteneğinden yararlanarak matematiksel tutarlılık ve adil dağıtım için Ters Ağırlıklı Dağıtım Formülünü (Ağırlık = 101 - Sıra, Toplam Ağırlık = 4753) inceledim, mantıklı buldum ve backend servis mimarisine entegre ettim.
2. **Score Buffer Mimarisi:** AI'ın kurguladığı in-memory buffer mimarisini inceledim ve doğru mimari karar olduğunu teyit ettim. 2 milyon günlük aktif kullanıcının her skor güncellemesini direkt Redis'e yazması sistemi ezer. Buffer bu yükü absorbe ediyor — gelen binlerce ayrı isteği 5 saniye boyunca hafızada toplar, sonra tek bir pipeline ile Redis'e gönderir. "Instant leaderboard" hedefi okuma tarafında Redis O(log N) ile zaten karşılanıyor, yazma gecikmesi kullanıcı deneyimini etkilemiyor.
3. **Simülasyon vs Gerçek Trafik:** Buffer tasarımını incelerken simülasyon endpoint'inin buffer'ı bypass etmesi gerektiğine karar verdim. Gerçek oyuncu trafiği "dağınık" gelir — binlerce ayrı HTTP isteği buffer'da toplanır. Simülasyon ise sunucu içinde tek seferde toplu üretilir. 1000 kullanıcıyı 5 saniye bekletmek mimari olarak anlamsız olurdu; üstelik demo izleyen kişi skor değişimini anlık göremezdi. Bu nedenle simulate endpoint'i kendi pipeline'ını oluşturarak direkt Redis'e yazar. İki farklı trafik karakteri, iki farklı yazma stratejisi.
4. **Database Dağılım Kararı:** 
Hangi verinin nerede tutulacağına ben karar verdim:
**Redis:** Gerçek zamanlı skor ve sıralama (Sorted Set) — O(log N) okuma garantisi
**PostgreSQL:** Kullanıcı profilleri ve kimlik doğrulama — kalıcı, ilişkisel veri
**MongoDB:** Haftalık ödül geçmişi ve loglar — yazma ağırlıklı, şemasız tarihsel kayıt
5. **UX Edge Case — Neighbors Algoritması:** İlk 100 dışındaki oyuncuların çevresini (3 yukarı, 2 aşağı) listelerken AI'ın ürettiği ilk kodlarda sınır durum hataları vardı. Oyuncu listenin en başında veya sonuna yakınsa Redis offset hesaplaması kayıyordu. Math.max(0, zeroBasedRank - 3) ile window başlangıcını sınırlayarak ve edge case'leri test ederek doğru hiyerarşiyi sağladım.
6. **Gerçek Zamanlı Zorluklar:** Geliştirme sürecinde Upstash Redis free tier limitine (500k komut/ay) ulaştım. Her simulate çağrısı yaklaşık 1000 Redis komutu üretiyor; simülasyon agresif çalışınca limit beklenmedik şekilde hızla doldu. Yeni bir database oluşturarak çözdüm. Bu deneyim, production'daki Redis komut yönetiminin ne kadar kritik olduğunu somut olarak gösterdi.
7. **Model Değişikliği ve Bağlam Yönetimi:** Claude Sonnet kotası tükenince Gemini'ye geçmek zorunda kaldım. Bu geçişte AI proje bağlamını kaybetti ve bazı çıktılarda yanlış tema (kripto metinleri, pixel art karışımı) ortaya çıktı. Bağlamı sıfırdan aktararak ve her prompt'u çok spesifik yazarak bu sorunları aştım. Bu süreç, AI'ın ne kadar iyi çıktı ürettiğinin büyük ölçüde prompt kalitesine ve bağlam yönetimine bağlı olduğunu gösterdi.


1. 