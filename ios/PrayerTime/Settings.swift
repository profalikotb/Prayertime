import Foundation
import CoreLocation

/// All preferences in UserDefaults. Defaults: Heliopolis, his own voice 15 min before, Refaat Adhan at every prayer.
struct Settings: Equatable {
    var lat: Double
    var lng: Double
    var city: String
    var country: String
    var hanafi: Bool
    var alertsOn: Bool
    var voiceOn: Bool
    var voiceChime: Bool
    var lead: Int
    var voiceOff: Set<String>
    var adhanOff: Set<String>

    func voice(_ p: Salah) -> Bool { !voiceOff.contains(p.rawValue) }
    func adhan(_ p: Salah) -> Bool { !adhanOff.contains(p.rawValue) }

    static let leads = [5, 10, 15, 20, 25]
    private static let d = UserDefaults.standard

    static func load() -> Settings {
        let d = d
        func dbl(_ k: String, _ v: Double) -> Double { d.object(forKey: k) == nil ? v : d.double(forKey: k) }
        func bool(_ k: String, _ v: Bool) -> Bool { d.object(forKey: k) == nil ? v : d.bool(forKey: k) }
        let lead = d.integer(forKey: "lead")
        return Settings(
            lat: dbl("lat", 30.0911), lng: dbl("lng", 31.3225),
            city: d.string(forKey: "city") ?? "مصر الجديدة",
            country: d.string(forKey: "country") ?? "EG",
            hanafi: bool("hanafi", false),
            alertsOn: bool("alertsOn", true),
            voiceOn: bool("voiceOn", true),
            voiceChime: bool("voiceChime", false),
            lead: leads.contains(lead) ? lead : 15,
            voiceOff: Set(d.stringArray(forKey: "voiceOff") ?? []),
            adhanOff: Set(d.stringArray(forKey: "adhanOff") ?? [])
        )
    }

    func save() {
        let d = Settings.d
        d.set(lat, forKey: "lat"); d.set(lng, forKey: "lng"); d.set(city, forKey: "city"); d.set(country, forKey: "country")
        d.set(hanafi, forKey: "hanafi"); d.set(alertsOn, forKey: "alertsOn"); d.set(voiceOn, forKey: "voiceOn")
        d.set(voiceChime, forKey: "voiceChime"); d.set(lead, forKey: "lead")
        d.set(Array(voiceOff), forKey: "voiceOff"); d.set(Array(adhanOff), forKey: "adhanOff")
    }
}

/// One-shot location fix + reverse geocoding (city name, country code for the calculation method).
@MainActor
final class Locator: NSObject, CLLocationManagerDelegate {
    private let m = CLLocationManager()
    private var done: ((CLLocation?) -> Void)?

    override init() {
        super.init()
        m.delegate = self
        m.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    func locate() async -> (Double, Double, String, String)? {
        let loc: CLLocation? = await withCheckedContinuation { c in
            done = { c.resume(returning: $0) }
            if m.authorizationStatus == .notDetermined { m.requestWhenInUseAuthorization() } else { m.requestLocation() }
        }
        guard let loc else { return nil }
        let pm = try? await CLGeocoder().reverseGeocodeLocation(loc, preferredLocale: Locale(identifier: "ar")).first
        let city = pm?.locality ?? pm?.subAdministrativeArea ?? pm?.administrativeArea ?? "موقعي"
        return (loc.coordinate.latitude, loc.coordinate.longitude, city, pm?.isoCountryCode ?? "EG")
    }

    private func finish(_ l: CLLocation?) {
        let f = done
        done = nil
        f?(l)
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            guard self.done != nil else { return }
            switch manager.authorizationStatus {
            case .authorizedWhenInUse, .authorizedAlways: manager.requestLocation()
            case .denied, .restricted: self.finish(nil)
            default: break
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let l = locations.last
        Task { @MainActor in self.finish(l) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.finish(nil) }
    }
}
