import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Building2, Check, Compass, Crown, Fish, Flag, Gem, Globe2, Landmark, Leaf, Link2, Lock, Map as MapIcon, MapPin, Mountain,
  PawPrint, Plane, Route, Search, Send, Snowflake, Star, Sun, Target, Trash2, TreePalm, Trophy, UserPlus, UtensilsCrossed,
  Waves, type LucideIcon,
} from 'lucide-react';
import { SiteHeader } from '../App';
import { WorldMap } from '../components/WorldMap';
import { countries as appCountries, ctx, places } from '../data';
import { WORLD, WORLD_BY_CODE, WORLD_CONTINENTS, isoOfAppCountry, type WorldContinent } from '../data/world';
import {
  BADGES, BADGE_GROUPS, POINTS, compareProfiles, decodeProfile, earnedBadges, encodeProfile, leaderboard, levelFor,
  nextGoals, profileStats, travelType, type BadgeIcon, type TravelProfile,
} from '../domain/profile';
import { copyText, sendPlan } from '../share';
import { useProfile } from '../store/profileStore';

const BADGE_ICON: Record<BadgeIcon, LucideIcon> = {
  flag: Flag, compass: Compass, globe: Globe2, crown: Crown, map: MapIcon, palm: TreePalm, mountain: Mountain, pin: MapPin,
  star: Star, sun: Sun, plane: Plane, landmark: Landmark, snow: Snowflake, waves: Waves, paw: PawPrint, route: Route,
  city: Building2, utensils: UtensilsCrossed, leaf: Leaf, fish: Fish, gem: Gem,
};

const WORLD_TOTAL: Record<WorldContinent, number> = Object.fromEntries(
  WORLD_CONTINENTS.map((c) => [c, WORLD.filter((w) => w.continent === c).length]),
) as Record<WorldContinent, number>;

const profileUrl = (p: TravelProfile) => `${location.origin}${location.pathname}#/vergleich/${encodeProfile(p)}`;
/** Code aus einem eingefügten Link oder direkt eingefügtem Code lesen */
const codeFromInput = (text: string) => text.trim().split('/vergleich/').pop()!.trim();

/** Stufe als Ring mit Punkten in der Mitte */
function LevelRing({ points }: { points: number }) {
  const level = levelFor(points);
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`Stufe ${level.name}, ${points} Punkte`}>
      <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--chip-tint)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - level.progress)} transform="rotate(-90 60 60)" />
      </svg>
      <span className="ring-text"><strong>{points}</strong><span>Punkte</span></span>
    </div>
  );
}

function BadgeItem({ id, stats }: { id: string; stats: ReturnType<typeof profileStats> }) {
  const b = BADGES.find((x) => x.id === id)!;
  const [have, goal] = b.progress(stats);
  const done = have >= goal;
  const Icon = BADGE_ICON[b.icon];
  return (
    <li className={`badge${done ? ' earned' : ''}`}>
      <span className="badge-icon">{done ? <Icon size={24} aria-hidden="true" /> : <Lock size={20} aria-hidden="true" />}</span>
      <span className="stack grow" style={{ ['--gap' as string]: '2px', minWidth: 0 }}>
        <strong>{b.name}</strong>
        <span className="small mute">{b.how}</span>
        {done ? (
          <span className="tiny" style={{ fontWeight: 600 }}>Erreicht · +{b.bonus} Punkte</span>
        ) : (
          <>
            <span className="mini-bar" aria-hidden="true"><span style={{ width: `${(have / goal) * 100}%` }} /></span>
            <span className="tiny" style={{ fontWeight: 600 }}>{have} von {goal}</span>
          </>
        )}
      </span>
    </li>
  );
}

function Badges({ p }: { p: TravelProfile }) {
  const stats = profileStats(p);
  const earned = earnedBadges(stats).length;
  return (
    <div className="stack" style={{ ['--gap' as string]: '14px' }}>
      <p className="mute small" style={{ margin: 0 }}>{earned} von {BADGES.length} Abzeichen erreicht</p>
      {BADGE_GROUPS.map((g) => (
        <div key={g} className="stack" style={{ ['--gap' as string]: '8px' }}>
          <h3 className="badge-group">{g}</h3>
          <ul className="badge-grid">
            {BADGES.filter((b) => b.group === g).map((b) => <BadgeItem key={b.id} id={b.id} stats={stats} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ContinentBars({ p }: { p: TravelProfile }) {
  const s = profileStats(p);
  return (
    <ul className="cont-bars">
      {WORLD_CONTINENTS.map((c) => (
        <li key={c}>
          <span className="row between small"><strong>{c}</strong><span className="mute">{s.perContinent[c]} von {WORLD_TOTAL[c]}</span></span>
          <span className="mini-bar" aria-hidden="true"><span style={{ width: `${(s.perContinent[c] / WORLD_TOTAL[c]) * 100}%` }} /></span>
        </li>
      ))}
    </ul>
  );
}

export function ProfilePage() {
  const profile = useProfile();
  const me: TravelProfile = { name: profile.name, countries: profile.countries, places: profile.places };
  const stats = profileStats(me);
  const level = levelFor(stats.points);
  const type = travelType(stats);
  const goals = nextGoals(stats);
  const [q, setQ] = useState('');
  const [cont, setCont] = useState<WorldContinent | 'Alle' | 'Bereist'>('Alle');
  const [friendLink, setFriendLink] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return WORLD.filter((c) => {
      if (cont === 'Bereist' && !profile.countries.includes(c.code)) return false;
      if (cont !== 'Alle' && cont !== 'Bereist' && c.continent !== cont) return false;
      return !ql || c.name.toLowerCase().includes(ql);
    });
  }, [q, cont, profile.countries]);

  // Orte der App in bereits bereisten Ländern
  const visitedPlaces = useMemo(() => {
    const iso = new Set(profile.countries);
    const ids = new Set(appCountries.filter((c) => isoOfAppCountry(c.id).some((x) => iso.has(x))).map((c) => c.id));
    return places.filter((p) => ids.has(p.countryId));
  }, [profile.countries]);

  const board = leaderboard([{ ...me, name: me.name.trim() || 'Du', isMe: true }, ...profile.friends.map((f) => ({ ...f, isMe: false }))]);

  const addFriend = () => {
    const p = decodeProfile(codeFromInput(friendLink), (id) => !!ctx.place(id));
    if (!p) { setStatus('Das ist kein gültiger Profil-Link.'); return; }
    profile.addFriend(p);
    setFriendLink('');
    setStatus(`${p.name} ist jetzt in deiner Rangliste.`);
  };

  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="wrap stack profile-main" style={{ ['--gap' as string]: '20px', paddingTop: 20 }}>
        {/* Kopf: Stufe, Punkte, Kennzahlen */}
        <section className="panel profile-head">
          <LevelRing points={stats.points} />
          <div className="stack grow" style={{ ['--gap' as string]: '10px', minWidth: 0 }}>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div className="stack" style={{ ['--gap' as string]: '2px' }}>
                <h1 style={{ fontSize: 26 }}>Mein Reiseprofil</h1>
                <span className="level-name"><Trophy size={20} aria-hidden="true" />{level.name}{type ? ` · ${type}` : ''}</span>
              </div>
              <div className="stack" style={{ ['--gap' as string]: '4px', flex: '0 1 240px' }}>
                <label htmlFor="profilname" className="label">Dein Name (für den Vergleich)</label>
                <input id="profilname" className="input" value={profile.name} maxLength={40} placeholder="z. B. Tim" onChange={(e) => profile.setName(e.target.value)} />
              </div>
            </div>
            <span className="small mute">{level.next ? `Noch ${level.toNext} Punkte bis zur Stufe „${level.next}“` : 'Höchste Stufe erreicht'}</span>
            <div className="stats">
              {[
                { k: 'Länder', v: stats.countries },
                { k: 'Welt gesehen', v: `${stats.worldShare} %` },
                { k: 'Kontinente', v: `${stats.continents.length} von 6` },
                { k: 'Abzeichen', v: `${earnedBadges(stats).length} von ${BADGES.length}` },
              ].map((x) => (
                <div key={x.k} className="card stat"><div className="label" style={{ fontSize: 12 }}>{x.k}</div><div className="v">{x.v}</div></div>
              ))}
            </div>
            <p className="tiny mute" style={{ margin: 0 }}>
              {POINTS.country} Punkte je Land · {POINTS.continent} je Kontinent · {POINTS.place} je Ort · Bonuspunkte für Abzeichen ({stats.bonusPoints})
            </p>
          </div>
        </section>

        {/* Nächste Ziele */}
        {goals.length > 0 && (
          <section className="panel stack" style={{ ['--gap' as string]: '10px' }} aria-labelledby="h-ziele">
            <h2 id="h-ziele" style={{ fontSize: 20, display: 'flex', gap: 8, alignItems: 'center' }}><Target size={20} aria-hidden="true" />Deine nächsten Ziele</h2>
            <ul className="goals">
              {goals.map(({ badge, have, goal, left }) => {
                const Icon = BADGE_ICON[badge.icon];
                return (
                  <li key={badge.id}>
                    <span className="badge-icon"><Icon size={22} aria-hidden="true" /></span>
                    <span className="stack grow" style={{ ['--gap' as string]: '3px', minWidth: 0 }}>
                      <strong>{badge.name}</strong>
                      <span className="small mute">{badge.how} – noch {left}</span>
                      <span className="mini-bar" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={have} aria-label={`Fortschritt ${badge.name}`}><span style={{ width: `${(have / goal) * 100}%` }} /></span>
                    </span>
                    <span className="goal-bonus">+{badge.bonus}</span>
                  </li>
                );
              })}
            </ul>
            <Link to="/" className="small">Reiseziele entdecken und die nächste Reise planen</Link>
          </section>
        )}

        {/* Weltkarte */}
        <section className="panel stack" style={{ ['--gap' as string]: '10px' }} aria-labelledby="h-karte">
          <div className="row between">
            <h2 id="h-karte" style={{ fontSize: 20 }}>Deine Weltkarte</h2>
            <span className="small mute">Auf ein Land klicken, um es als bereist zu markieren</span>
          </div>
          <WorldMap visited={profile.countries} onToggle={profile.toggleCountry} label={`Weltkarte: ${stats.countries} Länder bereist`} />
          <ContinentBars p={me} />
        </section>

        <div className="profile-two">
          <section className="panel stack" style={{ ['--gap' as string]: '12px' }} aria-labelledby="h-laender">
            <h2 id="h-laender" style={{ fontSize: 20 }}>Wo warst du schon?</h2>
            <div className="search">
              <Search size={20} color="var(--mute)" aria-hidden="true" />
              <input type="search" aria-label="Land suchen" placeholder="Land suchen …" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="chip-scroller" role="group" aria-label="Kontinent">
              {(['Alle', 'Bereist', ...WORLD_CONTINENTS] as const).map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={cont === c} onClick={() => setCont(c)}>
                  {c}{c === 'Bereist' ? ` (${stats.countries})` : c !== 'Alle' ? ` (${stats.perContinent[c]})` : ''}
                </button>
              ))}
            </div>
            <ul className="country-picker" aria-label="Länder">
              {list.map((c) => {
                const on = profile.countries.includes(c.code);
                return (
                  <li key={c.code}>
                    <button type="button" className={`pick${on ? ' on' : ''}`} aria-pressed={on} onClick={() => profile.toggleCountry(c.code)}>
                      <span className="pick-box" aria-hidden="true">{on && <Check size={14} />}</span>{c.name}
                    </button>
                  </li>
                );
              })}
              {!list.length && <li className="small mute">{cont === 'Bereist' ? 'Noch kein Land markiert.' : 'Kein Land gefunden.'}</li>}
            </ul>

            {visitedPlaces.length > 0 && (
              <>
                <h3 style={{ fontSize: 16, fontFamily: 'var(--font-body)' }}>Welche Orte hast du dort besucht?</h3>
                <p className="small mute" style={{ margin: 0 }}>Jeder Ort bringt Punkte und zählt für die Erlebnis-Abzeichen.</p>
                <div className="row" style={{ ['--gap' as string]: '6px' }}>
                  {visitedPlaces.map((p) => {
                    const on = profile.places.includes(p.id);
                    return (
                      <button key={p.id} type="button" className={`chip city-chip${on ? ' act' : ''}`} aria-pressed={on} onClick={() => profile.togglePlace(p.id)}>
                        {on && <Check size={15} aria-hidden="true" />}{p.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <div className="stack" style={{ ['--gap' as string]: '20px' }}>
            <section className="panel stack" style={{ ['--gap' as string]: '12px' }} aria-labelledby="h-vergleich">
              <h2 id="h-vergleich" style={{ fontSize: 20 }}>Freunde und Rangliste</h2>
              <p className="mute small" style={{ margin: 0 }}>
                Schick Freunden deinen Profil-Link. Fügst du ihren Link hier ein, siehst du ihre Reisen und ihr steht gemeinsam in der Rangliste.
              </p>
              <div className="row">
                <button type="button" className="btn btn-primary btn-small" onClick={async () => {
                  const ok = await copyText(profileUrl(me));
                  setStatus(ok ? 'Profil-Link kopiert.' : 'Kopieren nicht möglich.');
                }}><Link2 size={18} aria-hidden="true" />Meinen Profil-Link kopieren</button>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => sendPlan('Mein Reiseprofil', `${stats.points} Punkte, ${stats.countries} Länder – wie weit bist du?`, profileUrl(me))}>
                  <Send size={18} aria-hidden="true" />Senden
                </button>
              </div>
              <div className="row" style={{ alignItems: 'flex-end' }}>
                <div className="stack grow" style={{ ['--gap' as string]: '4px', flex: '1 1 220px' }}>
                  <label htmlFor="freundlink" className="label">Profil-Link eines Freundes</label>
                  <input id="freundlink" className="input" value={friendLink} placeholder="Link hier einfügen" onChange={(e) => setFriendLink(e.target.value)} />
                </div>
                <button type="button" className="btn btn-secondary btn-small" disabled={!friendLink.trim()} onClick={addFriend}><UserPlus size={18} aria-hidden="true" />Hinzufügen</button>
              </div>
              <p className="small" role="status" aria-live="polite" style={{ margin: 0, minHeight: 18 }}>{status}</p>

              <ol className="board">
                {board.map((r) => (
                  <li key={(r.isMe ? 'me:' : 'f:') + r.name} className={r.isMe ? 'me' : ''}>
                    <span className="board-rank">{r.rank}.</span>
                    <span className="grow stack" style={{ ['--gap' as string]: '0' }}>
                      <strong>{r.name}{r.isMe ? ' (du)' : ''}</strong>
                      <span className="small mute">{levelFor(r.stats.points).name} · {r.stats.countries} Länder · {earnedBadges(r.stats).length} Abzeichen</span>
                    </span>
                    <strong className="board-points">{r.stats.points} P.</strong>
                    {!r.isMe && (
                      <>
                        <button type="button" className="btn btn-secondary btn-small" onClick={() => navigate(`/vergleich/${encodeProfile(r)}`)}>Reisen ansehen</button>
                        <button type="button" className="ibtn" aria-label={`${r.name} entfernen`} onClick={() => profile.removeFriend(r.name)}><Trash2 size={18} aria-hidden="true" /></button>
                      </>
                    )}
                  </li>
                ))}
              </ol>
              {!profile.friends.length && <p className="small mute" style={{ margin: 0 }}>Noch keine Freunde in der Rangliste.</p>}
            </section>

            <section className="panel stack" style={{ ['--gap' as string]: '12px' }} aria-labelledby="h-badges">
              <h2 id="h-badges" style={{ fontSize: 20 }}>Abzeichen</h2>
              <Badges p={me} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

/** Reisen eines Freundes ansehen und mit den eigenen vergleichen (#/vergleich/:code) */
export function ComparePage() {
  const { code = '' } = useParams();
  const profile = useProfile();
  const other = useMemo(() => decodeProfile(code, (id) => !!ctx.place(id)), [code]);
  const me: TravelProfile = { name: profile.name.trim() || 'Du', countries: profile.countries, places: profile.places };

  if (!other) {
    return (
      <>
        <SiteHeader />
        <main id="inhalt" className="wrap" style={{ paddingTop: 24 }}>
          <h1>Dieser Link enthält kein gültiges Reiseprofil</h1>
          <p><Link to="/profil">Zu meinem Profil</Link></p>
        </main>
      </>
    );
  }

  const a = profileStats(me), b = profileStats(other);
  const cmp = compareProfiles(me, other);
  const names = (codes: string[]) => codes.map((c) => WORLD_BY_CODE.get(c)?.name ?? c).join(', ') || '–';
  const saved = profile.friends.some((f) => f.name === other.name);
  const verdict = a.points === b.points ? 'Gleichstand!' : a.points > b.points ? `Du liegst ${a.points - b.points} Punkte vorn.` : `${other.name} liegt ${b.points - a.points} Punkte vorn.`;
  const otherPlaces = other.places.map((id) => ctx.place(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const rows: [string, number | string, number | string][] = [
    ['Punkte', a.points, b.points],
    ['Stufe', levelFor(a.points).name, levelFor(b.points).name],
    ['Länder', a.countries, b.countries],
    ['Kontinente', a.continents.length, b.continents.length],
    ['Orte', a.places, b.places],
    ['Abzeichen', earnedBadges(a).length, earnedBadges(b).length],
  ];

  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="wrap stack profile-main" style={{ ['--gap' as string]: '18px', paddingTop: 20 }}>
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div className="stack" style={{ ['--gap' as string]: '4px' }}>
            <span className="label">Reisen von {other.name}</span>
            <h1 style={{ fontSize: 26 }}>{me.name} und {other.name}</h1>
            <span className="mute">{verdict}</span>
          </div>
          <div className="row">
            <button type="button" className="btn btn-primary btn-small" disabled={saved} onClick={() => profile.addFriend(other)}>
              {saved ? <Check size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}{saved ? 'In deiner Rangliste' : 'Zur Rangliste hinzufügen'}
            </button>
            <Link to="/profil" className="btn btn-secondary btn-small">Mein Profil</Link>
          </div>
        </div>

        <section className="panel stack" style={{ ['--gap' as string]: '10px' }}>
          <WorldMap visited={me.countries} other={other.countries} label={`Weltkarte: ${me.name} ${a.countries} Länder, ${other.name} ${b.countries} Länder`} />
          <div className="legend">
            <span><i className="lg-mine" aria-hidden="true" />nur {me.name}</span>
            <span><i className="lg-theirs" aria-hidden="true" />nur {other.name}</span>
            <span><i className="lg-both" aria-hidden="true" />beide</span>
          </div>
        </section>

        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="cmp-table">
            <thead><tr><th scope="col"><span className="sr-only">Wert</span></th><th scope="col">{me.name}</th><th scope="col">{other.name}</th></tr></thead>
            <tbody>
              {rows.map(([k, x, y]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td className={typeof x === 'number' && typeof y === 'number' && x > y ? 'win' : ''}>{x}</td>
                  <td className={typeof x === 'number' && typeof y === 'number' && y > x ? 'win' : ''}>{y}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="split">
          <section className="panel stack" style={{ ['--gap' as string]: '6px' }}><h2 style={{ fontSize: 17 }}>Beide waren in ({cmp.both.length})</h2><p style={{ margin: 0 }}>{names(cmp.both)}</p></section>
          <section className="panel stack" style={{ ['--gap' as string]: '6px' }}><h2 style={{ fontSize: 17 }}>Nur {me.name} ({cmp.onlyA.length})</h2><p style={{ margin: 0 }}>{names(cmp.onlyA)}</p></section>
          <section className="panel stack" style={{ ['--gap' as string]: '6px' }}>
            <h2 style={{ fontSize: 17 }}>Nur {other.name} ({cmp.onlyB.length}) – Ideen für dich</h2>
            <p style={{ margin: 0 }}>{names(cmp.onlyB)}</p>
          </section>
        </div>

        {otherPlaces.length > 0 && (
          <section className="panel stack" style={{ ['--gap' as string]: '8px' }}>
            <h2 style={{ fontSize: 20 }}>Orte, die {other.name} besucht hat</h2>
            <div className="row" style={{ ['--gap' as string]: '6px' }}>
              {otherPlaces.map((p) => (
                <Link key={p.id} to={`/land/${p.countryId}`} className="chip city-chip"><MapPin size={15} aria-hidden="true" />{p.name}<span className="tiny mute">{ctx.country(p).name}</span></Link>
              ))}
            </div>
          </section>
        )}

        <section className="panel stack" style={{ ['--gap' as string]: '12px' }}>
          <h2 style={{ fontSize: 20 }}>Abzeichen von {other.name}</h2>
          <Badges p={other} />
        </section>
      </main>
    </>
  );
}
