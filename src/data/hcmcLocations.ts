import { GraphData, PresetSelectionMap, Route, TouristLocation } from '../types';

/**
 * Du lieu duoc dong bo truc tiep tu Supabase vao ngay 2026-04-07.
 * Neu can cap nhat tiep, chi viec sua file nay va build lai web.
 */

export const INITIAL_LOCATIONS: TouristLocation[] = [
  {
    "id": "MC",
    "label": "Marie",
    "fullName": "THPT Marie Curie",
    "category": "Di sản học đường",
    "description": "Điểm đến lý tưởng để chiêm ngưỡng kiến trúc cổ điển Pháp giữa lòng Sài Gòn. Với khuôn viên xanh mát và những dãy hành lang vàng rực rỡ, đây không chỉ là nơi học tập mà còn là di sản văn hóa đặc sắc. Phù hợp cho những ai yêu thích chụp ảnh và tìm hiểu lịch sử giáo dục.",
    "shortIntro": "Là ngôi trường mang tên nữ bác học Marie Curie và được xây dựng từ năm 1918",
    "imageUrl": "https://images2.thanhnien.vn/528068263637045248/2024/3/12/1-1710213316279120465335.jpg",
    "neighborhood": "159 Nam Kỳ Khởi Nghĩa, Phường Xuân Hòa, Hồ Chí Minh, Việt Nam",
    "bestFor": "Chụp ảnh, Di tích lịch sử",
    "highlights": [
      "Kiến trúc cổ điển Pháp độc đáo"
    ],
    "x": 263,
    "y": 256,
    "fullNameEn": "Marie Curie High School",
    "descriptionEn": "An ideal spot to admire classic French architecture in the heart of Saigon. With its lush green campus and vibrant yellow corridors, it is not just a place for education but also a unique cultural heritage. Perfect for photography enthusiasts and those interested in education's history.",
    "shortIntroEn": "A prestigious high school established in 1918 that features French architecture and named after the Nobel-prize winning scientist Marie Curie.",
    "neighborhoodEn": "159 Nam Ky Khoi Nghia St., Xuan Hoa Ward, Ho Chi Minh City",
    "bestForEn": "Photography, Historical site",
    "highlightsEn": [
      "Unique French colonial architecture",
      "Historic landmark",
      "Centrally located"
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/2WUKuLytgaoKGuYM8",
    "images": [
      "https://images2.thanhnien.vn/528068263637045248/2024/3/12/1-1710213316279120465335.jpg",
      "https://cafefcdn.com/203337114487263232/2022/7/22/photo-1-16584813205191298720052.jpeg",
      "https://toquoc.mediacdn.vn/280518851207290880/2022/11/9/k149292-1-16680342063221259409123.jpg"
    ],
    "lat": 10.7824693989679,
    "lng": 106.690850472009,
    "displayOrder": 0
  },
  {
    "id": "DL",
    "label": "Dinh Độc",
    "fullName": "Dinh Độc Lập",
    "category": "Danh lam thắng cảnh",
    "description": "Dinh Độc Lập (hay Hội trường Thống Nhất) là một công trình kiến trúc độc đáo của kiến trúc sư Ngô Viết Thụ. Nơi đây từng là nơi ở và làm việc của Tổng thống Việt Nam Cộng hòa. Với khuôn viên xanh mát rộng lớn, các phòng họp sang trọng và hệ thống hầm trú ẩn kiên cố, Dinh không chỉ là một tuyệt tác kiến trúc mà còn là bảo tàng sống lưu giữ những khoảnh khắc lịch sử trọng đại của dân tộc.",
    "shortIntro": "Di tích quốc gia đặc biệt, biểu tượng của sự hòa hợp và kết thúc chiến tranh tại Việt Nam.",
    "neighborhood": "Bến Thành, Hồ Chí Minh, Việt Nam",
    "bestFor": "Chụp ảnh, Kiến trúc, lịch sử",
    "highlights": [
      "Kiến trúc hiện đại thập niên 60",
      "Di tích lịch sử đặc biệt"
    ],
    "x": 447,
    "y": 334,
    "fullNameEn": "Independence Palace",
    "descriptionEn": "The Independence Palace (also known as Reunification Hall) is a unique architectural work by architect Ngo Viet Thu. It served as the residence and workplace of the President of South Vietnam. Featuring a vast green grounds, luxurious meeting rooms, and a reinforced basement bunker system, the Palace is not only an architectural masterpiece but also a living museum preserving significant historical moments of the nation.",
    "shortIntroEn": "A special national relic, a symbol of harmony and of the end of the Vietnam war.",
    "neighborhoodEn": "Ben Thanh Ward, Ho Chi Minh City",
    "bestForEn": "Historical education, architectural tours, photography, international tourists.",
    "highlightsEn": [
      "1960s modern architecture",
      "Special historic site"
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/UfdguCJXt3w5kaDE9",
    "images": [
      "https://dinhdoclap.gov.vn/wp-content/uploads/2025/12/luu-nhap-tu-dong-9989.jpg",
      "https://dinhdoclap.gov.vn/wp-content/uploads/2025/12/anh-dinh-doc-lap-noi-luu-giu-dau-an-sau-50-nam-giai-phong-9957.jpg",
      "https://dulichlive.com/sai-gon/wp-content/uploads/sites/9/2020/11/Huong-dan-tham-quan-Dinh-Doc-Lap-01.jpg"
    ],
    "lat": 10.7780942731978,
    "lng": 106.696257590003,
    "displayOrder": 1
  },
  {
    "id": "CHỢ",
    "label": "Bến Thàn",
    "fullName": "Chợ Bến Thành",
    "category": "Mua sắm",
    "description": "Chợ Bến Thành là một trong những công trình tiêu biểu nhất của thành phố với tháp đồng hồ ở cửa Nam nổi tiếng. Chợ không chỉ là nơi giao thương sầm uất với đủ loại hàng hóa từ đồ lưu niệm, vải vóc đến thực phẩm, mà còn là thiên đường ẩm thực đường phố. Đây là điểm dừng chân lý tưởng để du khách tìm hiểu văn hóa địa phương và thưởng thức những món ăn đặc sản đậm chất miền Nam.",
    "shortIntro": "Ngôi chợ biểu tượng hơn 100 năm tuổi, nơi trải nghiệm nhịp sống Sài Gòn thực thụ qua ẩm thực và mua sắm.",
    "neighborhood": "Phường Bến Thành, Thành phố Hồ Chí Minh",
    "bestFor": "Mua sắm quà lưu niệm, thưởng thức ẩm thực, chụp ảnh check-in, khách du lịch quốc tế.",
    "highlights": [
      "Tháp đồng hồ biểu tượng",
      "Thiên đường ẩm thực"
    ],
    "x": 517,
    "y": 444,
    "fullNameEn": "Ben Thanh Market",
    "descriptionEn": "Ben Thanh Market is one of the city's most symbolic structures, famous for its South Gate clock tower. More than just a bustling trading hub for souvenirs, textiles, and groceries, it is also a street food paradise. It is the perfect spot for visitors to explore the local culture and enjoy authentic Southern Vietnamese specialties.",
    "shortIntroEn": "An iconic century-old market where you can experience authentic Saigon life through local cuisine and shopping.",
    "neighborhoodEn": "Ben Thanh Ward, Ho Chi Minh City",
    "bestForEn": "Souvenir shopping, food tasting, photography, international tourists.",
    "highlightsEn": [
      "Iconic clock tower",
      "Street food heaven"
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/chj29H2WfboEuUo26",
    "images": [
      "https://cly.1cdn.vn/thumbs/720x480/2026/02/10/W_dji_0963(2).jpg",
      "https://sakos.vn/wp-content/uploads/2024/07/THUMB-SAKOS-6.jpg",
      "https://cdn.thesaigontimes.vn/wp-content/uploads/2026/02/CHO-BEN-THANH-LE-VU-9.jpg"
    ],
    "lat": 10.7719601310374,
    "lng": 106.698306762831,
    "displayOrder": 2
  },
  {
    "id": "TCV",
    "label": "Thảo Cầm",
    "fullName": "Thảo Cầm Viên",
    "category": "Công viên",
    "description": "Được xây dựng từ năm 1864, Thảo Cầm Viên Sài Gòn là một trong những vườn thú lâu đời nhất thế giới còn tồn tại. Nơi đây nuôi dưỡng hơn 1.000 cá thể động vật thuộc hàng trăm loài và sở hữu bộ sưu tập thực vật quý hiếm khổng lồ. Với không gian rợp bóng cây cổ thụ, đây là điểm đến yêu thích để dã ngoại, tìm hiểu thiên nhiên và lưu giữ những kỷ niệm tuổi thơ của nhiều thế hệ người dân thành phố.",
    "shortIntro": "\"Lá phổi xanh\" lâu đời giữa lòng Sài Gòn với hệ sinh thái động thực vật phong phú và không gian thư giãn lý tưởng.",
    "neighborhood": "2 Nguyễn Bỉnh Khiêm, phường Bến Nghé, Quận 1, Hồ Chí Minh",
    "bestFor": "Dã ngoại gia đình, học tập ngoại khóa, chụp ảnh thiên nhiên, khách du lịch có trẻ nhỏ.",
    "highlights": [
      "Bảo tàng sinh vật học trong lòng Thành phố Hồ Chí Minh"
    ],
    "x": 746,
    "y": 169,
    "fullNameEn": "Saigon Zoo & Botanical Gardens",
    "descriptionEn": "Established in 1864, Saigon Zoo and Botanical Gardens is one of the world's oldest surviving zoos. It houses over 1,000 animals from hundreds of species and a vast collection of rare plants. With its canopy of ancient trees, it is a favorite destination for picnics, nature exploration, and a place that holds childhood memories for generations of city dwellers.",
    "shortIntroEn": "An ancient \"green lung\" in the heart of Saigon, featuring diverse flora and fauna and an ideal space for relaxation.",
    "neighborhoodEn": "2 Nguyen Binh Khiem, Ben Nghe Ward, District 1, Ho Chi Minh City",
    "bestForEn": "Family picnics, educational field trips, nature photography, tourists with children.",
    "highlightsEn": [
      "A biology museum in the heart of Ho Chi Minh City."
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/XPE2e1zggTyxGU8g9",
    "images": [
      "https://static.vinwonders.com/production/thao-cam-vien-1.jpg",
      "https://statics.vinpearl.com/thao-cam-vien-02_1630029974.jpg"
    ],
    "lat": 10.7873583903011,
    "lng": 106.705055231837,
    "displayOrder": 3
  },
  {
    "id": "BẾN",
    "label": "Bến Bạch",
    "fullName": "Bến Bạch Đằng",
    "category": "Danh lam thắng cảnh",
    "description": "Bến Bạch Đằng là một quần thể bao gồm công viên ven sông, ga tàu cao tốc và bến du thuyền. Sau khi được cải tạo, nơi đây trở thành không gian công cộng xanh mát với tầm nhìn cực đẹp hướng về phía những tòa nhà chọc trời của Thủ Thiêm. Đây là điểm xuất phát của tuyến xe buýt đường sông (Water Bus) - một trải nghiệm độc đáo để ngắm nhìn thành phố từ một góc độ hoàn toàn khác.",
    "shortIntro": "Công viên ven sông hiện đại, nơi lý tưởng để đi dạo, ngắm toàn cảnh Thủ Thiêm và trải nghiệm Water Bus.",
    "neighborhood": "1 Tôn Đức Thắng, Bến Nghé, Sài Gòn, Hồ Chí Minh",
    "bestFor": "Đi dạo hóng mát, chụp ảnh phong cảnh, hẹn hò, trải nghiệm bus sông.",
    "highlights": [
      "View sông Sài Gòn",
      "Công viên hiện đại",
      "Ga tàu thủy trung tâm",
      "Không gian thoáng đãng."
    ],
    "x": 803,
    "y": 382,
    "fullNameEn": "Bach Dang Wharf",
    "descriptionEn": "Bach Dang Wharf is a complex featuring a riverside park, a high-speed boat station, and a yacht pier. Following its renovation, it has become a lush public space offering stunning views of the Thu Thiem skyline. It serves as the main terminal for the Saigon Water Bus, a unique experience that allows visitors to see the city from a completely different perspective.",
    "shortIntroEn": "A modern riverside park, ideal for strolling, enjoying Thu Thiem panoramic views, and experiencing the Water Bus.",
    "neighborhoodEn": "1 Ton Duc Thang St., Ben Nghe Ward, Saigon, Ho Chi Minh City",
    "bestForEn": "Riverside walking, landscape photography, dating, water bus experience.",
    "highlightsEn": [
      "Saigon River view",
      "Modern park",
      "Central Water Bus station",
      "Airy open space."
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/ngcVc8q4tLQHTS498?g_st=ic",
    "images": [
      "https://ik.imagekit.io/tvlk/blog/2022/12/ben-bach-dang-5-1024x683.jpg?tr=q-70,c-at_max,w-1000,h-600",
      "https://www.traveloka.com/vi-vn/explore/destination/cong-vien-ben-bach-dang/258837"
    ],
    "lat": 10.775430835067,
    "lng": 106.706728903441,
    "displayOrder": 4
  },
  {
    "id": "BD",
    "label": "Bưu điện",
    "fullName": "Bưu điện Thành phố",
    "category": "Danh lam thắng cảnh",
    "description": "Được xây dựng từ năm 1886 đến 1891 bởi kiến trúc sư lừng danh Gustave Eiffel, Bưu điện Trung tâm Thành phố gây ấn tượng với sự kết hợp hài hòa giữa phong cách châu Âu và nét trang trí phương Đông. Bên trong, vòm trần cao vút cùng những bản đồ lịch sử vẽ tay trên tường tạo nên một không gian hoài cổ, đưa du khách trở về với vẻ đẹp của Sài Gòn xưa.",
    "shortIntro": "Kiệt tác kiến trúc Phục Hưng giữa lòng Sài Gòn, điểm đến di sản vẫn đang hoạt động bền bỉ sau hơn một thế kỷ.",
    "neighborhood": "02 Công trường Công xã Paris, Sài Gòn, Hồ Chí Minh",
    "bestFor": "Chụp ảnh check-in, gửi bưu thiếp, tìm hiểu lịch sử, tham quan kiến trúc.",
    "highlights": [
      "Kiến trúc Phục Hưng",
      "Vòm trần biểu tượng",
      "Bản đồ vẽ tay cổ kính",
      "Vị trí trung tâm."
    ],
    "x": 571,
    "y": 308,
    "fullNameEn": "Saigon Central Post Office",
    "descriptionEn": "Built between 1886 and 1891 by the famous architect Gustave Eiffel, the Central Post Office impresses with its harmonious blend of European style and Oriental motifs. Inside, the soaring vaulted ceilings and hand-painted historical maps on the walls create a nostalgic atmosphere, transporting visitors back to the timeless charm of old Saigon.",
    "shortIntroEn": "A Renaissance architectural masterpiece in the heart of Saigon, a living heritage site still operating after more than a century.",
    "neighborhoodEn": "02 Paris Commune Square, Saigon , Ho Chi Minh City",
    "bestForEn": "Photography, sending postcards, learning history, architectural tours.",
    "highlightsEn": [
      "Renaissance architecture",
      "Iconic vaulted ceiling",
      "Ancient hand-painted maps",
      "Prime central location."
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/LH4mKvc5U9akfj7r9",
    "images": [
      "https://images2.thanhnien.vn/528068263637045248/2023/6/5/hcm-1685938434919901822107.jpg",
      "https://cdn.xanhsm.com/2024/12/f10f8c19-buu-dien-sai-gon-1.jpg",
      "https://mia.vn/media/uploads/blog-du-lich/buu-dien-thanh-pho-1-1757126972.jpg"
    ],
    "lat": 10.7795905629358,
    "lng": 106.699910581114,
    "displayOrder": 5
  },
  {
    "id": "NT",
    "label": "Đức Bà",
    "fullName": "Nhà thờ Đức Bà",
    "category": "Danh lam thắng cảnh",
    "description": "Được khánh thành vào năm 1880, Nhà thờ Đức Bà là công trình tôn giáo biểu tượng với hai tháp chuông cao vút và toàn bộ gạch xây dựng được mang từ Marseille (Pháp) sang. Dù đang trong quá trình trùng tu, vẻ đẹp uy nghiêm và cổ kính của nhà thờ vẫn thu hút hàng ngàn du khách mỗi ngày. Đây không chỉ là nơi hành hương của giáo dân mà còn là bối cảnh chụp ảnh yêu thích của mọi du khách khi đến thành phố.",
    "shortIntro": "Tuyệt tác kiến trúc Roman pha trộn Gothic với gạch đỏ đặc trưng, trái tim của trung tâm Sài Gòn.",
    "neighborhood": "01 Công trường Công xã Paris, Bến Nghé, Hồ Chí Minh 70000, Việt Nam",
    "bestFor": "Chụp ảnh check-in, tham quan kiến trúc, du lịch tâm linh, khách du lịch lần đầu.",
    "highlights": [
      "Gạch đỏ Marseille",
      "Hai tháp chuông 57m"
    ],
    "x": 550,
    "y": 308,
    "fullNameEn": "Notre-Dame Cathedral Basilica of Saigon",
    "descriptionEn": "Inaugurated in 1880, Notre-Dame Cathedral is an iconic religious structure featuring twin bell towers and red bricks imported directly from Marseille, France. Although currently undergoing renovation, its solemn and ancient beauty continues to attract thousands of visitors daily. It is both a sacred place for pilgrimage and a favorite photography backdrop for anyone visiting the city.\nAlthough it is under maintenance at the moment, it still is a location worth visiting.",
    "shortIntroEn": "A Romanesque and Gothic architectural masterpiece with iconic red bricks, the heart of central Saigon.",
    "neighborhoodEn": "1 Paris Commune Square, Ben Nghe Ward, Ho Chi Minh City",
    "bestForEn": "Photography, architectural tours, spiritual tourism, first-time visitors.",
    "highlightsEn": [
      "Marseille red bricks",
      "57m twin bell towers"
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/J6c26rprYfDoPo8C6",
    "images": [
      "https://h3jd9zjnmsobj.vcdn.cloud/public/mytravelmap/images/2020/3/21/myloveforyou14022462/f63e9e292a2d93f4552f25d5bec0671d.jpg",
      "https://bloganchoi.com/wp-content/uploads/2022/08/z3654718992612-bda277f802645d92bf71ba88f98317e8-1.jpg"
    ],
    "lat": 10.7795749807071,
    "lng": 106.699277772353,
    "displayOrder": 6
  },
  {
    "id": "PĐB",
    "label": "Đi Bộ",
    "fullName": "Phố đi bộ Nguyễn Huệ",
    "category": "Danh lam thắng cảnh",
    "description": "Phố đi bộ Nguyễn Huệ kéo dài từ trước trụ sở UBND Thành phố đến bến Bạch Đằng, là không gian công cộng sầm uất với hệ thống phun nước nghệ thuật và nhiều cây xanh. Nơi đây tập trung vô số quán cà phê phong cách, nhà hàng đa dạng và các cửa hàng thương hiệu nổi tiếng. Đặc biệt vào mỗi tối cuối tuần, con phố trở nên náo nhiệt hơn bao giờ hết với các nhóm nghệ sĩ đường phố và bầu không khí trẻ trung, năng động.",
    "shortIntro": "Quảng trường đi bộ hiện đại bậc nhất thành phố, nơi diễn ra các hoạt động văn hóa, giải trí và biểu diễn nghệ thuật đường phố.",
    "neighborhood": "Đường Nguyễn Huệ, phường Sài Gòn",
    "bestFor": "Đi dạo ngắm cảnh, chụp ảnh check-in, trải nghiệm ẩm thực, tụ tập bạn bè.",
    "highlights": [
      "Quảng trường trung tâm",
      "Nhạc nước nghệ thuật"
    ],
    "x": 699,
    "y": 411,
    "fullNameEn": "Nguyen Hue Walking Street",
    "descriptionEn": "Stretching from the City Hall to Bach Dang Wharf, Nguyen Hue Walking Street is a bustling public space featuring artistic fountains and lush greenery. It is home to countless stylish cafes, diverse restaurants, and famous brand stores. Especially on weekend evenings, the street becomes livelier than ever with street performers and a youthful, energetic atmosphere.",
    "shortIntroEn": "The city's most modern pedestrian square, hosting vibrant cultural activities, entertainment, and street art performances.",
    "neighborhoodEn": "Nguyen Hue St., Saigon Ward",
    "bestForEn": "Walking, photography, food exploration, social gatherings.",
    "highlightsEn": [
      "Central square",
      "Musical fountains"
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/8ewnjfeuTDixYR748",
    "images": [
      "https://media-cdn-v2.laodong.vn/storage/newsportal/2026/3/11/1667669/Duong-Di-Bo-Nguyen-H-02.jpg",
      "https://www.vietnambooking.com/wp-content/uploads/2026/03/pho-di-bo-nguyen-hue-1.jpg",
      "https://mia.vn/media/uploads/blog-du-lich/pho-di-bo-nguyen-hue-1-1691590967.jpg"
    ],
    "lat": 10.7737834229336,
    "lng": 106.703680447996,
    "displayOrder": 7
  },
  {
    "id": "BT",
    "label": "Chiến Tr",
    "fullName": "Bảo tàng Chứng tích Chiến tranh",
    "category": "Danh lam thắng cảnh",
    "description": "Bảo tàng Chứng tích Chiến tranh là thành viên của Hệ thống các Bảo tàng vì Hòa bình thế giới. Nơi đây hiện lưu giữ hơn 20.000 tài liệu, hiện vật và phim ảnh về những tội ác chiến tranh và hậu quả tàn khốc của các thế lực xâm lược. Với các khu trưng bày ngoài trời về khí tài quân sự hạng nặng và các chuyên đề đặc biệt như \"Chuồng cọp\", bảo tàng mang lại những trải nghiệm cảm xúc mạnh mẽ và thông điệp sâu sắc về giá trị của hòa bình.",
    "shortIntro": "Bảo tàng lịch sử đặc biệt lưu giữ những chứng tích sống động về cuộc chiến tranh Việt Nam và khát vọng hòa bình của dân tộc.",
    "neighborhood": "28 đường Võ Văn Tần, Phường Xuân Hoà, Thành phố Hồ Chí Minh",
    "bestFor": "Tìm hiểu lịch sử, giáo dục truyền thống, khách du lịch quốc tế, nghiên cứu văn hóa.",
    "highlights": [
      "Hiện vật khí tài quân sự",
      "Triển lãm ảnh \"Hồi niệm\"",
      "Tái hiện \"Chuồng cọp\"",
      "Thông điệp hòa bình."
    ],
    "x": 311,
    "y": 312,
    "fullNameEn": "War Remnants Museum",
    "descriptionEn": "The War Remnants Museum is a member of the International Network of Museums for Peace. It currently houses over 20,000 documents, artifacts, and films documenting war crimes and the devastating aftermath of invasion. With outdoor displays of heavy military equipment and specialized exhibits like the \"Tiger Cages,\" the museum offers a powerful emotional experience and a profound message about the value of peace.",
    "shortIntroEn": "A poignant historical museum preserving vivid evidence of the Vietnam War and the nation's profound desire for peace.",
    "neighborhoodEn": "28 Vo Van Tan St., Xuan Hoa Ward, Ho Chi Minh City",
    "bestForEn": "Historical education, traditional education, international tourists, cultural research.",
    "highlightsEn": [
      "Military hardware artifacts",
      "\"Requiem\" photo exhibit",
      "\"Tiger Cages\" replica",
      "Message of peace."
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/wrSZHFjKWoRWSbVy6",
    "images": [
      "https://hnm.1cdn.vn/2025/04/29/cd873cca8e/a862.baotangctct.jpg",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTU6V-GVEB_UKqCyT3KV27gRylq3gLJzlC71g&s",
      "https://danviet.ex-cdn.com/files/f1/296231569849192448/2022/4/26/bao-tang-anh-1-16508779448961946546318-1650955891247202697253.jpeg"
    ],
    "lat": 10.7793432303188,
    "lng": 106.692266443069,
    "displayOrder": 8
  },
  {
    "id": "BNR",
    "label": "Nhà Rồng",
    "fullName": "Bến Nhà Rồng",
    "category": "Danh lam thắng cảnh",
    "description": "Bến Nhà Rồng là một trong những thương cảng lớn đầu tiên của Sài Gòn, nổi bật với đôi rồng gắn trên nóc nhà theo kiểu \"Lưỡng long chầu nguyệt\". Ngày nay, nơi đây là Bảo tàng Hồ Chí Minh, lưu giữ hàng ngàn hiện vật, hình ảnh về cuộc đời và sự nghiệp của vị lãnh tụ vĩ đại, đồng thời sở hữu tầm nhìn tuyệt đẹp hướng ra sông Sài Gòn.",
    "shortIntro": "Di tích lịch sử biểu tượng, nơi khởi đầu hành trình cứu nước của Bác Hồ với kiến trúc Đông Dương độc đáo.",
    "neighborhood": "1 Nguyễn Tất Thành, Xóm Chiếu",
    "bestFor": "Tìm hiểu lịch sử, tham quan bảo tàng, ngắm cảnh sông Sài Gòn, khách du lịch lần đầu.",
    "highlights": [
      "Kiến trúc Pháp-Việt",
      "Di tích lịch sử quốc gia",
      "View sông trực diện",
      "Vườn hoa xanh mát."
    ],
    "x": 812,
    "y": 512,
    "fullNameEn": "Dragon House Wharf",
    "descriptionEn": "Dragon House Wharf was one of Saigon's first major commercial ports, famous for the two dragon statues on its roof. Today, it serves as the Ho Chi Minh Museum, preserving thousands of artifacts and photos of the Great Leader's life and career, while offering a stunning panoramic view of the Saigon River.",
    "shortIntroEn": "An iconic historic site where Uncle Ho began his journey for national salvation, featuring unique Indochinese architecture.",
    "neighborhoodEn": "1 Nguyen Tat Thanh Street, Ward 13, Xom Chieu, Ho Chi Minh City, Vietnam",
    "bestForEn": "History learning, museum tours, Saigon river views, first-time visitors.",
    "highlightsEn": [
      "French-Vietnamese architecture",
      "National historic site",
      "Direct river view",
      "Lush green gardens."
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/Qcs5aaCNAkGVXeAY7",
    "images": [
      "https://cdn2.tuoitre.vn/thumb_w/1200/471584752817336320/2025/10/19/z7133141767810e0eb37aef2b49ac29cb79b4b2f4abcbf-1760866905456219396306-234-0-1574-2560-crop-17608686346202031835810.jpg",
      "https://static.vinwonders.com/production/ben-nha-rong-1.jpg"
    ],
    "lat": 10.7681343740776,
    "lng": 106.706986427307,
    "displayOrder": 9
  },
  {
    "id": "UBND",
    "label": "Ủy Ban",
    "fullName": "Trụ sở Ủy ban Nhân dân TP.HCM",
    "category": "Danh lam thắng cảnh",
    "description": "Tòa nhà được xây dựng từ năm 1898 đến 1909 với phong cách kiến trúc Phục Hưng đặc trưng. Mặt tiền tòa nhà được trang trí bằng các bức phù điêu tinh xảo, những cột trụ vững chãi và những tháp chuông thanh thoát. Nằm ở điểm cuối của phố đi bộ Nguyễn Huệ, đây là nơi check-in không thể bỏ qua, đặc biệt là vào ban đêm khi toàn bộ công trình được thắp sáng lung linh.",
    "shortIntro": "Công trình kiến trúc Pháp cổ kính và lộng lẫy nhất Sài Gòn, biểu tượng quyền lực và văn hóa của thành phố.",
    "neighborhood": "86 Lê Thánh Tôn, Bến Nghé, Sài Gòn, Hồ Chí Minh 700000, Việt Nam",
    "bestFor": "Chụp ảnh check-in, tìm hiểu kiến trúc cổ, đi dạo phố đi bộ, tham quan đêm.",
    "highlights": [
      "Kiến trúc Pháp cổ điển",
      "Vị trí trung tâm đắc địa",
      "Mặt tiền điêu khắc tinh xảo",
      "Biểu tượng của thành phố."
    ],
    "x": 637,
    "y": 376,
    "fullNameEn": "Ho Chí Minh City People's Committee",
    "descriptionEn": "Built between 1898 and 1909 in a distinctive Renaissance style, the building features an ornate facade with exquisite bas-reliefs, sturdy pillars, and elegant bell towers. Located at the end of Nguyen Hue Walking Street, it is a must-visit photo spot, especially at night when the entire structure is beautifully illuminated.",
    "shortIntroEn": "One of Saigon's most magnificent French colonial buildings, an iconic symbol of the city's power and culture.",
    "neighborhoodEn": "86 Le Thanh Ton, Ben Nghe, Saigon, Ho Chi Minh",
    "bestForEn": "Photography, architectural tours, walking street strolls, night sightseeing.",
    "highlightsEn": [
      "French colonial architecture",
      "Prime central location",
      "Ornate sculpted facade",
      "Iconic city landmark."
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/Fr5s6uGPrKiTAFFa8",
    "images": [
      "https://upload.wikimedia.org/wikipedia/commons/4/4a/Ayuntamiento%2C_Ciudad_Ho_Chi_Minh%2C_Vietnam%2C_2013-08-14%2C_DD_01.JPG",
      "https://tphcm.cdnchinhphu.vn/zoom/600_315/334895287454388224/2023/4/22/ubnd-tphcm-1-1682142573560143980867-12-0-612-960-crop-16821426016981553728476.jpg",
      "https://uploads.nguoidothi.net.vn/content/f65eff16-522c-4acb-9ee3-9e26f6739215.jpg"
    ],
    "lat": 10.7757490176058,
    "lng": 106.701852535485,
    "displayOrder": 10
  },
  {
    "id": "CHUANGOCHOANG",
    "label": "Chùa",
    "fullName": "Chùa Ngọc Hoàng",
    "category": "Danh lam thắng cảnh",
    "description": "Chùa Ngọc Hoàng (hay Điện Ngọc Hoàng) là một ngôi chùa cổ theo kiểu Trung Hoa với những mảng chạm khắc gỗ tinh xảo và các pho tượng bằng giấy bồi độc đáo. Nơi đây nổi tiếng là điểm đến tâm linh để cầu bình an, sự nghiệp và đặc biệt là cầu con cái tại điện Kim Thoa Thánh Mẫu. Không gian trầm mặc, khói hương nghi ngút cùng hồ rùa biểu tượng tạo nên sức hút riêng biệt cho địa danh này.",
    "shortIntro": "Ngôi chùa linh thiêng bậc nhất Sài Gòn với kiến trúc người Hoa đặc sắc, từng đón tiếp Tổng thống Barack Obama.",
    "neighborhood": "73 Mai Thị Lựu, Tân Định",
    "bestFor": "Tham quan văn hóa, cầu may mắn, chụp ảnh kiến trúc, khách du lịch tâm linh.",
    "highlights": [
      "Kiến trúc cổ kính",
      "Linh thiêng bậc nhất",
      "Hồ rùa biểu tượng",
      "Di tích nghệ thuật quốc gia."
    ],
    "x": 472,
    "y": 88,
    "fullNameEn": "Jade Emperor Pagoda",
    "descriptionEn": "The Jade Emperor Pagoda is an ancient Chinese-style temple adorned with intricate woodcarvings and unique papier-mâché statues. It is a renowned spiritual site for those seeking peace, success, and especially fertility at the Kim Thoa Holy Mother hall. The solemn atmosphere, drifting incense, and the iconic turtle pond contribute to the unique charm of this landmark.",
    "shortIntroEn": "One of Saigon's most sacred pagodas, featuring stunning Chinese architecture and famous for hosting President Barack Obama.",
    "neighborhoodEn": "73 Mai Thi Luu, Tan Dinh Ward",
    "bestForEn": "Cultural sightseeing, praying for luck, architectural photography, spiritual tourists.",
    "highlightsEn": [
      "Ancient architecture",
      "Highly sacred",
      "Iconic turtle pond",
      "National artistic heritage."
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/eQE68G1Ev8bhae4d9",
    "images": [
      "https://statics.vinpearl.com/chua-ngoc-hoang-2_1630222820.jpg",
      "https://cdn.xanhsm.com/2024/11/2033a3d8-chua-ngoc-hoang-01.jpg"
    ],
    "lat": 10.7919110611704,
    "lng": 106.696987112471,
    "displayOrder": 12
  },
  {
    "id": "BITEXCO",
    "label": "Bitexco",
    "fullName": "Tòa nhà Bitexco Financial",
    "category": "Mua sắm",
    "description": "Bitexco Financial Tower từng là tòa nhà cao nhất TP.HCM, nổi bật với thiết kế lấy cảm hứng từ búp sen vươn cao. Điểm nhấn đặc biệt nhất là đài quan sát Saigon Skydeck ở tầng 49 và sân đậu trực thăng lơ lửng ở tầng 52. Đây là tổ hợp văn phòng, mua sắm và giải trí sang trọng",
    "shortIntro": "Biểu tượng hiện đại của Sài Gòn với kiến trúc búp sen độc đáo và đài quan sát 360 độ ngắm toàn cảnh thành phố.",
    "neighborhood": "2 Hải Triều, Bến Nghé, Sài Gòn",
    "bestFor": "Ngắm cảnh thành phố, mua sắm, chụp ảnh nghệ thuật, khách du lịch lần đầu.",
    "highlights": [
      "Kiến trúc búp sen",
      "Đài quan sát Skydeck",
      "Sân đậu trực thăng độc đáo",
      "Biểu tượng hiện đại."
    ],
    "x": 754,
    "y": 457,
    "fullNameEn": "Bitexco Financial Tower",
    "descriptionEn": "Bitexco Financial Tower, once the tallest building in HCMC, stands out with its design inspired by a rising lotus bud. The highlights include the Saigon Skydeck on the 49th floor and a cantilevered helipad on the 52nd floor. It is a luxury complex for offices, shopping, and entertainment",
    "shortIntroEn": "A modern icon of Saigon featuring unique lotus-inspired architecture and a 360-degree city observatory.",
    "neighborhoodEn": "2 Hai Trieu Street, Ben Nghe Ward, Saigon",
    "bestForEn": "City sightseeing, shopping, photography, first-time visitors",
    "highlightsEn": [
      "Lotus-shaped design",
      "Skydeck observatory",
      "Unique helipad",
      "Modern iconic landmark."
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/X41wrbdwJEddWBqC6",
    "images": [
      "https://dlsconsultant.com/wp-content/uploads/2023/09/Bitexco-Financial-Tower-1.jpg",
      "https://image.kkday.com/v2/image/get/c_fit%2Cq_55%2Ct_webp%2Cw_960/s1.kkday.com/product_20969/20181220033905_UDpyQ/jpg",
      "https://images.pexels.com/photos/30097233/pexels-photo-30097233.jpeg?cs=srgb&dl=pexels-phamthe-30097233.jpg&fm=jpg"
    ],
    "lat": 10.7712118509732,
    "lng": 106.70529127121,
    "displayOrder": 13
  },
  {
    "id": "CHUAXALOI",
    "label": "Chùa Xá",
    "fullName": "Chùa Xá Lợi",
    "category": "Danh lam thắng cảnh",
    "description": "Chùa Xá Lợi không chỉ là một trung tâm Phật giáo quan trọng mà còn là chứng nhân lịch sử cho những phong trào đấu tranh của Phật giáo tại Sài Gòn. Ngôi chùa nổi tiếng với tháp chuông 7 tầng cao 32m, bên trong thờ xá lợi Phật Thích Ca và các bức bích họa tuyệt đẹp về cuộc đời đức Phật, tạo nên một không gian thanh tịnh và uy nghiêm.",
    "shortIntro": "Ngôi chùa lịch sử với tháp chuông cao nhất Việt Nam và kiến trúc hiện đại kết hợp truyền thống độc đáo.",
    "neighborhood": "89 Bà Huyện Thanh Quan, Phường 7, Xuân Hòa, Hồ Chí Minh",
    "bestFor": "Chiêm bái Phật giáo, tìm hiểu lịch sử, tham quan kiến trúc, thiền định.",
    "highlights": [
      "Tháp chuông cao nhất Việt Nam",
      "Kiến trúc Phật giáo hiện đại",
      "Lưu giữ Xá lợi Phật",
      "Không gian yên tĩnh."
    ],
    "x": 88,
    "y": 312,
    "fullNameEn": "Xa Loi Buddhist Temple",
    "descriptionEn": "Xa Loi Pagoda is not only a key Buddhist center but also a historical witness to Buddhist movements in Saigon. The pagoda is famous for its 32-meter, 7-story bell tower, housing the relics of Gautama Buddha and stunning murals depicting the Buddha's life, creating a peaceful and solemn atmosphere.",
    "shortIntroEn": "A historic pagoda featuring the tallest bell tower in Vietnam and a unique blend of modern and traditional architecture.",
    "neighborhoodEn": "89 Ba Huyen Thanh Quan Street, Ward 7, Xuan Hoa Ward, Ho Chi Minh City",
    "bestForEn": "Buddhist worship, history learning, architectural tours, meditation.",
    "highlightsEn": [
      "Vietnam's tallest bell tower",
      "Modern Buddhist architecture",
      "Housing Sacred Relics",
      "Peaceful atmosphere."
    ],
    "googleMapsUrl": "https://maps.app.goo.gl/R8vsToPBohEFJ3EW8",
    "images": [
      "https://image.giacngo.vn/w770/Uploaded/2026/uobkhuo/2025_11_06/24d7ae4ec19c74c22d8d-4914-8498.jpg.webp",
      "https://static.vinwonders.com/production/chua-xa-loi-2.jpg",
      "https://katana.bdatrip.com/v2/image?src=https%3A%2F%2Fimages.bdatrip.com%2F2024%2F10%2Fchua-xa-loi.png&w=3840"
    ],
    "lat": 10.7793492311296,
    "lng": 106.685714951035,
    "displayOrder": 14
  }
];

export const INITIAL_ROUTES: Route[] = [
  {
    "id": "BD__BẾN",
    "from": "BẾN",
    "to": "BD",
    "distanceKm": 0.8
  },
  {
    "id": "BD__BITEXCO",
    "from": "BD",
    "to": "BITEXCO",
    "distanceKm": 1
  },
  {
    "id": "BD__BNR",
    "from": "BD",
    "to": "BNR",
    "distanceKm": 1.4
  },
  {
    "id": "BD__BT",
    "from": "BD",
    "to": "BT",
    "distanceKm": 0.9
  },
  {
    "id": "BD__CHỢ",
    "from": "CHỢ",
    "to": "BD",
    "distanceKm": 0.8
  },
  {
    "id": "BD__CHUANGOCHOANG",
    "from": "BD",
    "to": "CHUANGOCHOANG",
    "distanceKm": 1.5
  },
  {
    "id": "BD__CHUAXALOI",
    "from": "BD",
    "to": "CHUAXALOI",
    "distanceKm": 1.6
  },
  {
    "id": "BD__DL",
    "from": "DL",
    "to": "BD",
    "distanceKm": 0.5
  },
  {
    "id": "BD__MC",
    "from": "MC",
    "to": "BD",
    "distanceKm": 1
  },
  {
    "id": "BD__NT",
    "from": "BD",
    "to": "NT",
    "distanceKm": 0.2
  },
  {
    "id": "BD__PĐB",
    "from": "BD",
    "to": "PĐB",
    "distanceKm": 0.7
  },
  {
    "id": "BD__TCV",
    "from": "TCV",
    "to": "BD",
    "distanceKm": 1
  },
  {
    "id": "BD__UBND",
    "from": "BD",
    "to": "UBND",
    "distanceKm": 0.5
  },
  {
    "id": "BẾN__CHỢ",
    "from": "CHỢ",
    "to": "BẾN",
    "distanceKm": 1
  },
  {
    "id": "BẾN__CHUANGOCHOANG",
    "from": "BẾN",
    "to": "CHUANGOCHOANG",
    "distanceKm": 2.1
  },
  {
    "id": "BẾN__CHUAXALOI",
    "from": "BẾN",
    "to": "CHUAXALOI",
    "distanceKm": 2.3
  },
  {
    "id": "BẾN__DL",
    "from": "DL",
    "to": "BẾN",
    "distanceKm": 1.6
  },
  {
    "id": "BẾN__MC",
    "from": "MC",
    "to": "BẾN",
    "distanceKm": 3
  },
  {
    "id": "BẾN__NT",
    "from": "NT",
    "to": "BẾN",
    "distanceKm": 1.2
  },
  {
    "id": "BẾN__PĐB",
    "from": "PĐB",
    "to": "BẾN",
    "distanceKm": 0.5
  },
  {
    "id": "BẾN__TCV",
    "from": "TCV",
    "to": "BẾN",
    "distanceKm": 1.3
  },
  {
    "id": "BẾN__UBND",
    "from": "UBND",
    "to": "BẾN",
    "distanceKm": 0.9
  },
  {
    "id": "BITEXCO__BẾN",
    "from": "BITEXCO",
    "to": "BẾN",
    "distanceKm": 0.6
  },
  {
    "id": "BITEXCO__BNR",
    "from": "BITEXCO",
    "to": "BNR",
    "distanceKm": 1.1
  },
  {
    "id": "BITEXCO__BT",
    "from": "BT",
    "to": "BITEXCO",
    "distanceKm": 1.7
  },
  {
    "id": "BITEXCO__CHỢ",
    "from": "CHỢ",
    "to": "BITEXCO",
    "distanceKm": 1
  },
  {
    "id": "BITEXCO__CHUANGOCHOANG",
    "from": "CHUANGOCHOANG",
    "to": "BITEXCO",
    "distanceKm": 2.5
  },
  {
    "id": "BITEXCO__CHUAXALOI",
    "from": "CHUAXALOI",
    "to": "BITEXCO",
    "distanceKm": 2.1
  },
  {
    "id": "BITEXCO__DL",
    "from": "DL",
    "to": "BITEXCO",
    "distanceKm": 1.2
  },
  {
    "id": "BITEXCO__MC",
    "from": "MC",
    "to": "BITEXCO",
    "distanceKm": 2
  },
  {
    "id": "BITEXCO__NT",
    "from": "NT",
    "to": "BITEXCO",
    "distanceKm": 1.1
  },
  {
    "id": "BITEXCO__PĐB",
    "from": "PĐB",
    "to": "BITEXCO",
    "distanceKm": 0.2
  },
  {
    "id": "BITEXCO__TCV",
    "from": "TCV",
    "to": "BITEXCO",
    "distanceKm": 1.8
  },
  {
    "id": "BITEXCO__UBND",
    "from": "UBND",
    "to": "BITEXCO",
    "distanceKm": 0.8
  },
  {
    "id": "BNR__BẾN",
    "from": "BNR",
    "to": "BẾN",
    "distanceKm": 1.3
  },
  {
    "id": "BNR__BT",
    "from": "BT",
    "to": "BNR",
    "distanceKm": 2
  },
  {
    "id": "BNR__CHỢ",
    "from": "BNR",
    "to": "CHỢ",
    "distanceKm": 1.8
  },
  {
    "id": "BNR__CHUANGOCHOANG",
    "from": "BNR",
    "to": "CHUANGOCHOANG",
    "distanceKm": 2.9
  },
  {
    "id": "BNR__CHUAXALOI",
    "from": "BNR",
    "to": "CHUAXALOI",
    "distanceKm": 2.6
  },
  {
    "id": "BNR__DL",
    "from": "DL",
    "to": "BNR",
    "distanceKm": 2.8
  },
  {
    "id": "BNR__MC",
    "from": "MC",
    "to": "BNR",
    "distanceKm": 3.6
  },
  {
    "id": "BNR__NT",
    "from": "NT",
    "to": "BNR",
    "distanceKm": 1.5
  },
  {
    "id": "BNR__PĐB",
    "from": "PĐB",
    "to": "BNR",
    "distanceKm": 0.7
  },
  {
    "id": "BNR__TCV",
    "from": "TCV",
    "to": "BNR",
    "distanceKm": 3.2
  },
  {
    "id": "BNR__UBND",
    "from": "BNR",
    "to": "UBND",
    "distanceKm": 1
  },
  {
    "id": "BT__BẾN",
    "from": "BT",
    "to": "BẾN",
    "distanceKm": 2.7
  },
  {
    "id": "BT__CHỢ",
    "from": "CHỢ",
    "to": "BT",
    "distanceKm": 1.1
  },
  {
    "id": "BT__CHUANGOCHOANG",
    "from": "BT",
    "to": "CHUANGOCHOANG",
    "distanceKm": 1.5
  },
  {
    "id": "BT__CHUAXALOI",
    "from": "CHUAXALOI",
    "to": "BT",
    "distanceKm": 1
  },
  {
    "id": "BT__DL",
    "from": "DL",
    "to": "BT",
    "distanceKm": 1.3
  },
  {
    "id": "BT__MC",
    "from": "MC",
    "to": "BT",
    "distanceKm": 0.3
  },
  {
    "id": "BT__NT",
    "from": "NT",
    "to": "BT",
    "distanceKm": 1.2
  },
  {
    "id": "BT__PĐB",
    "from": "PĐB",
    "to": "BT",
    "distanceKm": 1.4
  },
  {
    "id": "BT__TCV",
    "from": "TCV",
    "to": "BT",
    "distanceKm": 1.7
  },
  {
    "id": "BT__UBND",
    "from": "BT",
    "to": "UBND",
    "distanceKm": 1.1
  },
  {
    "id": "CHỢ__DL",
    "from": "DL",
    "to": "CHỢ",
    "distanceKm": 1.5
  },
  {
    "id": "CHỢ__MC",
    "from": "MC",
    "to": "CHỢ",
    "distanceKm": 2.5
  },
  {
    "id": "CHỢ__NT",
    "from": "NT",
    "to": "CHỢ",
    "distanceKm": 0.5
  },
  {
    "id": "CHỢ__PĐB",
    "from": "CHỢ",
    "to": "PĐB",
    "distanceKm": 0.6
  },
  {
    "id": "CHỢ__TCV",
    "from": "TCV",
    "to": "CHỢ",
    "distanceKm": 2.2
  },
  {
    "id": "CHỢ__UBND",
    "from": "CHỢ",
    "to": "UBND",
    "distanceKm": 0.6
  },
  {
    "id": "CHUANGOCHOANG__CHỢ",
    "from": "CHỢ",
    "to": "CHUANGOCHOANG",
    "distanceKm": 2.2
  },
  {
    "id": "CHUANGOCHOANG__CHUAXALOI",
    "from": "CHUANGOCHOANG",
    "to": "CHUAXALOI",
    "distanceKm": 1.9
  },
  {
    "id": "CHUANGOCHOANG__DL",
    "from": "DL",
    "to": "CHUANGOCHOANG",
    "distanceKm": 1.8
  },
  {
    "id": "CHUANGOCHOANG__MC",
    "from": "MC",
    "to": "CHUANGOCHOANG",
    "distanceKm": 1.4
  },
  {
    "id": "CHUANGOCHOANG__NT",
    "from": "NT",
    "to": "CHUANGOCHOANG",
    "distanceKm": 1.4
  },
  {
    "id": "CHUANGOCHOANG__PĐB",
    "from": "PĐB",
    "to": "CHUANGOCHOANG",
    "distanceKm": 2.1
  },
  {
    "id": "CHUANGOCHOANG__TCV",
    "from": "CHUANGOCHOANG",
    "to": "TCV",
    "distanceKm": 0.9
  },
  {
    "id": "CHUANGOCHOANG__UBND",
    "from": "UBND",
    "to": "CHUANGOCHOANG",
    "distanceKm": 1.9
  },
  {
    "id": "CHUAXALOI__CHỢ",
    "from": "CHỢ",
    "to": "CHUAXALOI",
    "distanceKm": 1.6
  },
  {
    "id": "CHUAXALOI__DL",
    "from": "DL",
    "to": "CHUAXALOI",
    "distanceKm": 1.2
  },
  {
    "id": "CHUAXALOI__MC",
    "from": "MC",
    "to": "CHUAXALOI",
    "distanceKm": 0.8
  },
  {
    "id": "CHUAXALOI__NT",
    "from": "NT",
    "to": "CHUAXALOI",
    "distanceKm": 1.5
  },
  {
    "id": "CHUAXALOI__PĐB",
    "from": "PĐB",
    "to": "CHUAXALOI",
    "distanceKm": 2.1
  },
  {
    "id": "CHUAXALOI__TCV",
    "from": "TCV",
    "to": "CHUAXALOI",
    "distanceKm": 2.3
  },
  {
    "id": "CHUAXALOI__UBND",
    "from": "CHUAXALOI",
    "to": "UBND",
    "distanceKm": 2
  },
  {
    "id": "DL__MC",
    "from": "MC",
    "to": "DL",
    "distanceKm": 0.75
  },
  {
    "id": "DL__NT",
    "from": "DL",
    "to": "NT",
    "distanceKm": 0.65
  },
  {
    "id": "DL__PĐB",
    "from": "DL",
    "to": "PĐB",
    "distanceKm": 0.9
  },
  {
    "id": "DL__TCV",
    "from": "DL",
    "to": "TCV",
    "distanceKm": 1.5
  },
  {
    "id": "DL__UBND",
    "from": "DL",
    "to": "UBND",
    "distanceKm": 0.5
  },
  {
    "id": "MC__NT",
    "from": "MC",
    "to": "NT",
    "distanceKm": 1.5
  },
  {
    "id": "MC__PĐB",
    "from": "MC",
    "to": "PĐB",
    "distanceKm": 1.7
  },
  {
    "id": "MC__TCV",
    "from": "MC",
    "to": "TCV",
    "distanceKm": 2.2
  },
  {
    "id": "MC__UBND",
    "from": "MC",
    "to": "UBND",
    "distanceKm": 1.4
  },
  {
    "id": "NT__PĐB",
    "from": "NT",
    "to": "PĐB",
    "distanceKm": 0.8
  },
  {
    "id": "NT__TCV",
    "from": "NT",
    "to": "TCV",
    "distanceKm": 1.2
  },
  {
    "id": "NT__UBND",
    "from": "NT",
    "to": "UBND",
    "distanceKm": 0.5
  },
  {
    "id": "PĐB__TCV",
    "from": "TCV",
    "to": "PĐB",
    "distanceKm": 1.5
  },
  {
    "id": "PĐB__UBND",
    "from": "PĐB",
    "to": "UBND",
    "distanceKm": 0.3
  },
  {
    "id": "TCV__UBND",
    "from": "TCV",
    "to": "UBND",
    "distanceKm": 1.3
  }
];

export const INITIAL_GRAPH_DATA: GraphData = {
  locations: INITIAL_LOCATIONS,
  routes: INITIAL_ROUTES,
};

export const PRESET_SELECTIONS: PresetSelectionMap = {
  "cycle": {
    "ids": [
      "MC",
      "TCV",
      "DL",
      "BNR",
      "CHỢ"
    ],
    "routeIds": [
      "BNR__CHỢ",
      "BNR__DL",
      "BNR__MC",
      "BNR__TCV",
      "CHỢ__DL",
      "CHỢ__MC",
      "CHỢ__TCV",
      "DL__MC",
      "DL__TCV",
      "MC__TCV"
    ],
    "label": "Di sản quanh trường",
    "desc": "THPT Marie Curie → Thảo Cầm Viên → Dinh Độc Lập → Bến Nhà Rồng → Chợ Bến Thành",
    "startId": "MC"
  },
  "path": {
    "ids": [
      "MC",
      "DL",
      "BT",
      "NT",
      "BẾN"
    ],
    "routeIds": [
      "BẾN__DL",
      "BẾN__NT",
      "BT__BẾN",
      "BT__DL",
      "BT__MC",
      "BT__NT",
      "DL__MC",
      "DL__NT",
      "MC__NT"
    ],
    "label": "",
    "desc": "THPT Marie Curie → Dinh Độc Lập → Bảo tàng Chứng tích Chiến tranh → Nhà thờ Đức Bà → Bến Bạch Đằng",
    "startId": "MC",
    "endId": "BẾN"
  },
  "subset": {
    "ids": [
      "MC",
      "UBND",
      "CHUAXALOI",
      "BD",
      "BITEXCO",
      "BNR"
    ],
    "routeIds": [
      "BD__MC",
      "BD__UBND",
      "BITEXCO__BNR",
      "BITEXCO__CHUAXALOI",
      "BITEXCO__UBND",
      "BNR__MC",
      "CHUAXALOI__MC",
      "CHUAXALOI__UBND",
      "MC__UBND"
    ],
    "label": "",
    "desc": "THPT Marie Curie → Trụ sở Ủy ban Nhân dân TP.HCM → Chùa Xá Lợi → Bưu điện Thành phố → Tòa nhà Bitexco Financial → Bến Nhà Rồng",
    "startId": "MC",
    "endId": "BNR"
  }
};
