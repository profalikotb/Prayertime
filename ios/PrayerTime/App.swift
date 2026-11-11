import SwiftUI

@main
struct PrayerTimeApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.layoutDirection, .rightToLeft)
                .environment(\.locale, Locale(identifier: "ar_EG"))
        }
    }
}

private let emerald = Color(red: 0.05, green: 0.54, blue: 0.42)
private let gold = Color(red: 0.78, green: 0.62, blue: 0.29)
private let ink = Color(red: 0.04, green: 0.18, blue: 0.15)

struct ContentView: View {
    @Environment(\.scenePhase) private var phase
    @State private var s = Settings.load()
    @State private var now = Date()
    @State private var armed = 0
    @State private var status = ""
    @State private var busy = false
    @State private var locator = Locator()
    @State private var job: Task<Void, Never>?
    private let tick = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    private var today: DayTimes? { Engine.day(now, lat: s.lat, lng: s.lng, country: s.country, hanafi: s.hanafi) }
    private var next: (Salah, Date)? {
        if let t = today, let p = Salah.allCases.first(where: { (t.times[$0] ?? .distantPast) > now }) { return (p, t.times[p]!) }
        if let tm = Calendar.current.date(byAdding: .day, value: 1, to: now),
           let t = Engine.day(tm, lat: s.lat, lng: s.lng, country: s.country, hanafi: s.hanafi), let f = t.times[.fajr] { return (.fajr, f) }
        return nil
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                header
                timesCard
                alertsCard
                placeCard
                Text("أ.د. على قطب على · أستاذ جراحة المخ والأعصاب – جامعة عين شمس")
                    .font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center).padding(.bottom, 20)
            }
            .padding(.horizontal, 16)
        }
        .background(Color(red: 0.98, green: 0.97, blue: 0.94).ignoresSafeArea())
        .onReceive(tick) { now = $0 }
        .onChange(of: s) { _, v in
            v.save()
            rearmSoon()
        }
        .onChange(of: phase) { _, p in
            if p == .active { now = Date(); rearmSoon() }
        }
        .task { await rearm() }
    }

    // MARK: sections

    private var header: some View {
        VStack(spacing: 4) {
            Text("مواقيت الصلاة").font(.system(size: 26, weight: .bold)).foregroundStyle(.white)
            Text("\(Fmt.date.string(from: now)) · \(Fmt.hijri.string(from: now))").font(.footnote).foregroundStyle(.white.opacity(0.85))
            if let (p, at) = next {
                let mins = Int(at.timeIntervalSince(now) / 60)
                Text("القادمة: \(p.label(on: at)) \(Fmt.time.string(from: at))").font(.headline).foregroundStyle(gold).padding(.top, 6)
                Text("بعد \(mins / 60) س \(mins % 60) د").font(.subheadline).foregroundStyle(.white)
            }
        }
        .frame(maxWidth: .infinity).padding(.vertical, 18)
        .background(LinearGradient(colors: [ink, emerald], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 22))
        .padding(.top, 8)
    }

    private var timesCard: some View {
        card("مواقيت اليوم · \(s.city)", icon: "clock") {
            if let t = today {
                ForEach(Salah.allCases) { p in
                    let at = t.times[p]!
                    HStack {
                        Text(p.label(on: now)).font(.body.weight(next?.0 == p ? .bold : .regular))
                        Spacer()
                        Text(Fmt.time.string(from: at)).font(.body.monospacedDigit().weight(next?.0 == p ? .bold : .regular))
                    }
                    .foregroundStyle(next?.0 == p ? emerald : .primary)
                    .padding(.vertical, 3)
                    if p == .fajr {
                        HStack { Text("الشروق").foregroundStyle(.secondary); Spacer(); Text(Fmt.time.string(from: t.sunrise)).monospacedDigit().foregroundStyle(.secondary) }
                            .font(.subheadline).padding(.vertical, 2)
                    }
                }
            }
        }
    }

    private var alertsCard: some View {
        card("التنبيهات (منبّه النظام)", icon: "alarm") {
            Toggle("تفعيل التنبيهات", isOn: $s.alertsOn).tint(emerald)
            Toggle("التنبيه بصوتي قبل الأذان", isOn: $s.voiceOn).tint(emerald)
            if s.voiceOn {
                Picker("قبل الأذان بـ", selection: $s.lead) {
                    ForEach(Settings.leads, id: \.self) { Text("\($0)").tag($0) }
                }
                .pickerStyle(.segmented)
                Text("قبل الأذان بـ \(Fmt.minutesAr(s.lead))").font(.caption).foregroundStyle(.secondary)
                Picker("الصوت", selection: $s.voiceChime) {
                    Text("🎙 صوتي").tag(false)
                    Text("نغمة المنبّه").tag(true)
                }
                .pickerStyle(.segmented)
            }
            Divider()
            HStack {
                Text("الصلاة").font(.caption.bold())
                Spacer()
                Text("🎙 صوتي").font(.caption.bold()).frame(width: 64)
                Text("🕌 الأذان").font(.caption.bold()).frame(width: 64)
            }
            ForEach(Salah.allCases) { p in
                HStack {
                    Text(p.ar)
                    Spacer()
                    check(!s.voiceOff.contains(p.rawValue)) { on in
                        if on { s.voiceOff.remove(p.rawValue) } else { s.voiceOff.insert(p.rawValue) }
                    }.frame(width: 64).opacity(s.voiceOn ? 1 : 0.35)
                    check(!s.adhanOff.contains(p.rawValue)) { on in
                        if on { s.adhanOff.remove(p.rawValue) } else { s.adhanOff.insert(p.rawValue) }
                    }.frame(width: 64)
                }
            }
            Text("الأذان: الشيخ محمد رفعت – مختصر").font(.caption).foregroundStyle(.secondary)
            Divider()
            Button {
                Task {
                    busy = true
                    let ok = await Alarms.test(s)
                    status = ok ? "✓ اقفل الشاشة الآن: صوتك بعد ٣٠ ث ثم الأذان بعد ٦٠ ث" : "لم يُسمح بالمنبّهات — الإعدادات ← مواقيت الصلاة ← المنبّهات"
                    busy = false
                    Task { try? await Task.sleep(for: .seconds(65)); rearmSoon() }
                }
            } label: {
                Label("تجربة كاملة (٣٠ ث ثم ٦٠ ث)", systemImage: "play.circle.fill").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent).tint(emerald).disabled(busy)
            Text(armed > 0 ? "✓ \(armed) منبّهًا مجدولًا لـ \(Alarms.days) أيام · يعمل والتطبيق مغلق وفي الوضع الصامت" : (status.isEmpty ? "افتح التطبيق مرة أسبوعيًا ليُجدِّد المنبّهات." : ""))
                .font(.caption).foregroundStyle(armed > 0 ? emerald : .secondary)
            if !status.isEmpty { Text(status).font(.caption).foregroundStyle(gold) }
        }
    }

    private var placeCard: some View {
        card("الموقع والحساب", icon: "location") {
            HStack {
                Text("\(s.city) · \(String(format: "%.4f, %.4f", s.lat, s.lng))").font(.subheadline)
                Spacer()
                Button("تحديد موقعي") {
                    Task {
                        if let (la, ln, c, cc) = await locator.locate() {
                            s.lat = la; s.lng = ln; s.city = c; s.country = cc
                        } else { status = "تعذّر تحديد الموقع — اسمح به من الإعدادات" }
                    }
                }
                .buttonStyle(.bordered).tint(emerald)
            }
            HStack {
                Button("مصر الجديدة") { s.lat = 30.0911; s.lng = 31.3225; s.city = "مصر الجديدة"; s.country = "EG" }
                Button("طوخ") { s.lat = 30.3539; s.lng = 31.2014; s.city = "طوخ"; s.country = "EG" }
            }
            .buttonStyle(.bordered).tint(gold).font(.footnote)
            Picker("العصر", selection: $s.hanafi) {
                Text("العصر: الجمهور").tag(false)
                Text("العصر: الحنفي").tag(true)
            }
            .pickerStyle(.segmented)
            Text(s.country == "EG" ? "الهيئة المصرية العامة للمساحة (١٩٫٥° / ١٧٫٥°)" : "طريقة الحساب حسب الدولة (\(s.country))")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    // MARK: helpers

    /** debounced: settings changes in quick succession re-arm once */
    private func rearmSoon() {
        job?.cancel()
        job = Task {
            try? await Task.sleep(for: .milliseconds(800))
            if Task.isCancelled { return }
            await rearm()
        }
    }

    private func rearm() async {
        armed = await Alarms.reschedule(s)
        if armed == 0 && s.alertsOn && !Alarms.authorized {
            status = "اسمح بالمنبّهات: الإعدادات ← مواقيت الصلاة ← المنبّهات"
        }
    }

    private func check(_ on: Bool, _ set: @escaping (Bool) -> Void) -> some View {
        Button { set(!on) } label: {
            Image(systemName: on ? "checkmark.circle.fill" : "circle").font(.title3).foregroundStyle(on ? emerald : .secondary)
        }
        .buttonStyle(.plain)
    }

    private func card<C: View>(_ title: String, icon: String, @ViewBuilder _ c: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: icon).font(.headline).foregroundStyle(ink)
            c()
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 18))
        .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
    }
}
