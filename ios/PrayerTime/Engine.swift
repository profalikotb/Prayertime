import Foundation
import Adhan

/// The five obligatory prayers, in order.
enum Salah: String, CaseIterable, Identifiable, Codable {
    case fajr, dhuhr, asr, maghrib, isha
    var id: String { rawValue }

    var ar: String {
        switch self {
        case .fajr: return "الفجر"
        case .dhuhr: return "الظهر"
        case .asr: return "العصر"
        case .maghrib: return "المغرب"
        case .isha: return "العشاء"
        }
    }

    /// «الجمعة» instead of «الظهر» on Friday
    func label(on day: Date, cal: Calendar = .current) -> String {
        self == .dhuhr && cal.component(.weekday, from: day) == 6 ? "الجمعة" : ar
    }
}

struct DayTimes {
    let day: Date
    let times: [Salah: Date]
    let sunrise: Date
}

/// Same engine and conventions as the web app (adhan, Egyptian Survey with true Dhuhr, nearest-minute rounding).
enum Engine {
    static func params(country: String, hanafi: Bool) -> CalculationParameters {
        var p: CalculationParameters
        switch country.uppercased() {
        case "EG", "SD", "":
            // Egyptian General Authority of Survey: 19.5° / 17.5°, no +1 min Dhuhr margin
            p = CalculationMethod.other.params
            p.fajrAngle = 19.5
            p.ishaAngle = 17.5
        case "SA":
            p = CalculationMethod.ummAlQura.params
        case "US", "CA":
            p = CalculationMethod.northAmerica.params
        case "AE":
            p = CalculationMethod.dubai.params
        case "KW":
            p = CalculationMethod.kuwait.params
        case "QA":
            p = CalculationMethod.qatar.params
        case "TR":
            p = CalculationMethod.turkey.params
        case "PK", "IN", "BD", "AF":
            p = CalculationMethod.karachi.params
        case "SG", "MY", "ID", "BN":
            p = CalculationMethod.singapore.params
        case "IR":
            p = CalculationMethod.tehran.params
        default:
            p = CalculationMethod.muslimWorldLeague.params
        }
        p.madhab = hanafi ? .hanafi : .shafi
        p.rounding = .none
        return p
    }

    static func day(_ date: Date, lat: Double, lng: Double, country: String, hanafi: Bool, cal: Calendar = .current) -> DayTimes? {
        let comps = cal.dateComponents([.year, .month, .day], from: date)
        guard let pt = PrayerTimes(coordinates: Coordinates(latitude: lat, longitude: lng), date: comps,
                                   calculationParameters: params(country: country, hanafi: hanafi)) else { return nil }
        func near(_ d: Date) -> Date { Date(timeIntervalSince1970: (d.timeIntervalSince1970 / 60).rounded() * 60) }
        func floor(_ d: Date) -> Date { Date(timeIntervalSince1970: (d.timeIntervalSince1970 / 60).rounded(.down) * 60) }
        return DayTimes(day: cal.startOfDay(for: date),
                        times: [.fajr: near(pt.fajr), .dhuhr: near(pt.dhuhr), .asr: near(pt.asr), .maghrib: near(pt.maghrib), .isha: near(pt.isha)],
                        sunrise: floor(pt.sunrise))
    }
}

enum Fmt {
    static let time: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar_EG")
        f.dateFormat = "h:mm a"
        return f
    }()
    static let date: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar_EG")
        f.dateFormat = "EEEE dd/MM/yyyy"
        return f
    }()
    static let hijri: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .islamicUmmAlQura)
        f.locale = Locale(identifier: "ar")
        f.dateFormat = "d MMMM yyyy هـ"
        return f
    }()

    static func minutesAr(_ m: Int) -> String {
        switch m {
        case 5: return "خمس دقائق"
        case 10: return "عشر دقائق"
        case 15: return "خمس عشرة دقيقة"
        case 20: return "عشرون دقيقة"
        case 25: return "خمس وعشرون دقيقة"
        default: return "\(m) دقيقة"
        }
    }
}
