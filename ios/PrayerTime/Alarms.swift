import Foundation
import SwiftUI
import AlarmKit
import ActivityKit

struct PrayerAlarmMeta: AlarmMetadata {
    var prayer: String
    var kind: String // "voice" | "adhan" | "test"
}

/// System alarms (AlarmKit, iOS 26): ring with the app closed, the phone locked, in silent mode and Focus,
/// with the alarm volume — like the Clock app. Each run replaces all previously scheduled alarms.
@MainActor
enum Alarms {
    static let days = 7 // scheduled ahead; opening the app re-arms the next week

    static var authorized: Bool { AlarmManager.shared.authorizationState == .authorized }

    @discardableResult
    static func requestAuthorization() async -> Bool {
        switch AlarmManager.shared.authorizationState {
        case .authorized: return true
        case .denied: return false
        default:
            return (try? await AlarmManager.shared.requestAuthorization()) == .authorized
        }
    }

    static func cancelAll() {
        if let all = try? AlarmManager.shared.alarms {
            for a in all { try? AlarmManager.shared.cancel(id: a.id) }
        }
    }

    /// Returns the number of alarms armed.
    static func reschedule(_ s: Settings) async -> Int {
        guard await requestAuthorization() else { return 0 }
        cancelAll()
        guard s.alertsOn else { return 0 }
        let cal = Calendar.current
        let now = Date()
        var n = 0
        for d in 0..<days {
            if Task.isCancelled { return n }
            guard let day = cal.date(byAdding: .day, value: d, to: now),
                  let t = Engine.day(day, lat: s.lat, lng: s.lng, country: s.country, hanafi: s.hanafi) else { continue }
            for p in Salah.allCases {
                guard let at = t.times[p] else { continue }
                let name = p.label(on: day)
                if s.voiceOn && s.voice(p) {
                    let v = at.addingTimeInterval(TimeInterval(-s.lead * 60))
                    if v > now.addingTimeInterval(5),
                       await arm(at: v, title: "⏳ باقي \(Fmt.minutesAr(s.lead)) على أذان \(name)", sound: s.voiceChime ? nil : "reminder_own.caf",
                                 meta: PrayerAlarmMeta(prayer: p.rawValue, kind: "voice")) { n += 1 }
                }
                if s.adhan(p), at > now.addingTimeInterval(5),
                   await arm(at: at, title: "🕌 حان الآن وقت صلاة \(name) · \(s.city)", sound: "adhan_refaat.caf",
                             meta: PrayerAlarmMeta(prayer: p.rawValue, kind: "adhan")) { n += 1 }
            }
        }
        return n
    }

    /// Test: your voice in 30 s, then the Adhan in 60 s (lock the phone to check).
    static func test(_ s: Settings) async -> Bool {
        guard await requestAuthorization() else { return false }
        let now = Date()
        let a = await arm(at: now.addingTimeInterval(30), title: "⏳ تجربة: التنبيه بصوتك", sound: s.voiceChime ? nil : "reminder_own.caf", meta: PrayerAlarmMeta(prayer: "test", kind: "test"))
        let b = await arm(at: now.addingTimeInterval(60), title: "🕌 تجربة: أذان الشيخ محمد رفعت", sound: "adhan_refaat.caf", meta: PrayerAlarmMeta(prayer: "test", kind: "test"))
        return a && b
    }

    private static func arm(at date: Date, title: String, sound: String?, meta: PrayerAlarmMeta) async -> Bool {
        let stop = AlarmButton(text: "إيقاف", textColor: .white, systemImageName: "stop.circle.fill")
        let alert = AlarmPresentation.Alert(title: LocalizedStringResource(String.LocalizationValue(title)), stopButton: stop)
        let attrs = AlarmAttributes<PrayerAlarmMeta>(presentation: AlarmPresentation(alert: alert), metadata: meta, tintColor: Color(red: 0.05, green: 0.54, blue: 0.42))
        let cfg = AlarmManager.AlarmConfiguration<PrayerAlarmMeta>(
            schedule: .fixed(date),
            attributes: attrs,
            sound: sound.map { .named($0) } ?? .default
        )
        do {
            _ = try await AlarmManager.shared.schedule(id: UUID(), configuration: cfg)
            return true
        } catch {
            return false
        }
    }
}
