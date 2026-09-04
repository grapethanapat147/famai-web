import { ALL_PERMS } from "@/lib/auth/permissions";
import { FLOWS, ROLE_COLOR, ROLE_LABEL, type RoleCode } from "@/lib/flow/flows";
import {
  FLOW_BOOK,
  MANUAL_COMPANY,
  MANUAL_EDITION,
  PERM_LABEL,
  ROLE_MANUALS,
  ROLE_PERMS,
  flowsForRole,
  groupOfScreen,
  hiddenScreensForRole,
  isManualRole,
  manualBook,
  screenTitle,
  screensForRole,
} from "@/lib/manual/manual";

/**
 * คู่มือหนึ่งเล่มในรูปแบบพร้อมพิมพ์ (FAM-1138)
 * เป็น server component ล้วน ไม่มี state — เปิดดูในเบราว์เซอร์ก็ได้ สั่งพิมพ์เป็น PDF ก็ได้ผลเดียวกัน
 */

const META = (extra: string) => [MANUAL_COMPANY, "ระบบจัดการร้าน (Next.js)", MANUAL_EDITION, extra];

function Cover({
  title,
  role,
  why,
  contents,
  meta,
}: {
  title: string;
  role?: string;
  why: string;
  contents: string[];
  meta: string[];
}) {
  return (
    <div className="cover">
      <div className="eyebrow">คู่มือการใช้งาน · ระบบจัดการร้านฟ้าใหม่</div>
      <h1>{title}</h1>
      {role ? <div className="role">{role}</div> : null}
      <div className="why">{why}</div>
      <div className="toc">
        <b>ในเล่มนี้:</b> {contents.join(" · ")}
      </div>
      <div className="meta">{meta.join(" · ")}</div>
    </div>
  );
}

function ScreenFigures({ keys, hasSamples }: { keys: string[]; hasSamples: boolean }) {
  if (keys.length === 0) {
    return null;
  }
  return (
    <div className="figs">
      <h2>ภาคผนวก · หน้าจอจริง</h2>
      <p className="lead">
        หน้าพรีวิวของระบบจริงที่ความกว้างมือถือ (มือถือคือจอหลักของร้าน) ย่อส่วนมาวางให้ดูว่าหน้าตาและตำแหน่งปุ่มอยู่ตรงไหน
        ตัวเลขในภาพเป็นข้อมูลจำลองของหน้าพรีวิว{hasSamples ? " จึงไม่ตรงกับชุดข้อมูลตัวอย่างในหัวข้อที่ 4" : ""} — ให้ดูรูปร่างหน้าจอ ไม่ใช่ตัวเลข
        ทั้งหมดไม่ใช่ข้อมูลลูกค้าจริง
      </p>
      <div className="grid2">
        {keys.map((k) => (
          <div className="fig" key={k}>
            <div className="frame">
              <iframe src={`/dev/${k}`} title={`หน้าจอ${screenTitle(k)}`} scrolling="no" loading="eager" />
            </div>
            <div className="cap">{screenTitle(k)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleChips({ roles }: { roles: readonly RoleCode[] }) {
  return (
    <>
      {roles.map((r) => (
        <span className="tag role" key={r} style={{ background: ROLE_COLOR[r], marginRight: "3pt" }}>
          {ROLE_LABEL[r]}
        </span>
      ))}
    </>
  );
}

function RoleBook({ role }: { role: RoleCode }) {
  const doc = ROLE_MANUALS[role];
  const perms = ROLE_PERMS[role];
  const mine = screensForRole(role);
  const hidden = hiddenScreensForRole(role);
  const flows = flowsForRole(role);
  const figures = [...new Set(doc.samples.map((s) => s.screen))];

  return (
    <>
      <Cover
        title="คู่มือสำหรับ"
        role={ROLE_LABEL[role]}
        why={doc.why}
        contents={[
          `หน้าจอที่คุณเห็น ${mine.length} หน้า`,
          "สิทธิ์ของคุณ",
          "งานประจำวันทีละขั้น",
          "ตัวอย่างที่เห็นบนจอ",
          "จุดที่มักพลาด",
          "สายงานที่คุณเกี่ยวข้อง",
        ]}
        meta={META(`สิทธิ์: ${ALL_PERMS.filter((p) => perms[p]).map((p) => PERM_LABEL[p]).join(" · ") || "ดูและกรอกงานของตัวเอง"}`)}
      />

      <h2>1 · หน้าจอที่คุณเห็น ({mine.length} หน้า)</h2>
      <p className="lead">
        เมนูขึ้นตามบทบาท หน้าที่ไม่เกี่ยวกับงานคุณจะไม่โผล่ให้รก บนมือถือหน้าที่ใช้บ่อยที่สุดอยู่แถบล่าง ที่เหลืออยู่ในปุ่ม “อื่น ๆ”
      </p>
      <table>
        <thead>
          <tr>
            <th style={{ width: "26%" }}>หน้า</th>
            <th style={{ width: "22%" }}>หมวด</th>
            <th>ใช้ทำอะไร</th>
          </tr>
        </thead>
        <tbody>
          {mine.map((m) => (
            <tr key={m.key}>
              <td>
                <b>{m.title}</b>
              </td>
              <td>{groupOfScreen(m.key)}</td>
              <td>{m.subtitle}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>2 · สิทธิ์ของคุณ</h2>
      <table>
        <thead>
          <tr>
            <th>สิทธิ์</th>
            <th style={{ width: "22%" }}>บทบาทนี้</th>
          </tr>
        </thead>
        <tbody>
          {ALL_PERMS.map((p) => (
            <tr key={p}>
              <td>{PERM_LABEL[p]}</td>
              <td>
                <span className={`tag ${perms[p] ? "yes" : "no"}`}>{perms[p] ? "ได้" : "ไม่ได้"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {perms.money ? null : (
        <p className="lead">
          ช่องตัวเงินขึ้นขีด (—) แทนตัวเลข ทั้งบนจอ ในไฟล์ที่ส่งออก และตอนพิมพ์ — เป็นการปิดตามสิทธิ์ ไม่ใช่ข้อมูลหาย
        </p>
      )}
      {perms.allBranch ? null : (
        <p className="lead">คุณเห็นเฉพาะข้อมูลบริษัทที่ตัวเองสังกัด รายการของบริษัทอื่นจะไม่ปรากฏในทุกหน้าและทุกรายงาน</p>
      )}

      <h2>3 · งานประจำวันทีละขั้น</h2>
      {doc.daily.map((sec, i) => (
        <div key={sec.title}>
          <h3>
            {i + 1}. {sec.title}
          </h3>
          <ol>
            {sec.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      ))}

      <h2>4 · ตัวอย่างที่คุณจะเห็นบนจอ</h2>
      <p className="lead">
        ตัวเลขและชื่อด้านล่างมาจากชุดข้อมูลตัวอย่างที่ติดมากับระบบ — เข้าด้วยบัญชีทดลองแล้วจะเห็นตรงตามนี้
        ใช้เทียบว่าหน้าจอที่ถูกต้องควรออกมาหน้าตาแบบไหน
      </p>
      {doc.samples.map((s) => (
        <div className="sample" key={s.screen}>
          <div className="hd">{screenTitle(s.screen)}</div>
          <ul>
            {s.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      ))}

      <h2>5 · จุดที่มักพลาด</h2>
      {doc.gotchas.map((g) => (
        <div className="warn" key={g}>
          {g}
        </div>
      ))}

      <h2>6 · สายงานที่คุณเกี่ยวข้อง</h2>
      <p className="lead">
        ขั้นที่เป็นของคุณขึ้นหมายเลขสีแดง ขั้นอื่นแสดงไว้ให้รู้ว่างานจะไปต่อที่ใคร — ผังเต็มทั้ง {FLOWS.length} สายงานอยู่ในเล่มผังกระบวนการ
      </p>
      {flows.map((f) => (
        <div key={f.key}>
          <h3>{f.title}</h3>
          <p className="lead">{f.description}</p>
          {f.steps.map((s, i) => {
            const isMine = s.roles.includes(role) || role === "admin";
            return (
              <div className={`step${isMine ? " mine" : ""}`} key={s.title}>
                <div className="n">{i + 1}</div>
                <div className="t">{s.title}</div>
                <div className="w">
                  {s.roles.map((r) => ROLE_LABEL[r]).join(" · ")}
                  {s.screen ? ` · ที่หน้า ${screenTitle(s.screen)}` : ""}
                </div>
                {s.note ? <div>{s.note}</div> : null}
              </div>
            );
          })}
        </div>
      ))}

      <h2>7 · {hidden.length === 0 ? "หน้าที่คุณไม่เห็น (ไม่มี)" : "หน้าที่คุณไม่เห็น และใครทำแทน"}</h2>
      {hidden.length === 0 ? (
        <p className="lead">
          บทบาทนี้เห็นครบทั้ง {mine.length} หน้า ไม่มีหน้าไหนถูกซ่อน — เห็นได้ทุกหน้าจึงต้องระวังเป็นพิเศษ
          ทุกการแก้ไขบันทึกชื่อผู้ทำไว้ในหน้าประวัติการแก้ไข
        </p>
      ) : (
        <>
          <p className="lead">
            อีก {hidden.length} หน้าในระบบไม่ขึ้นให้บทบาทนี้ ถ้าต้องใช้ให้ขอกับผู้ที่มีสิทธิ์ — ไม่ใช่ยืมบัญชีกันเข้า เพราะทุกการแก้ไขบันทึกชื่อผู้ทำไว้
          </p>
          <table>
            <thead>
              <tr>
                <th style={{ width: "32%" }}>หน้าที่ไม่เห็น</th>
                <th>ใครทำแทน</th>
              </tr>
            </thead>
            <tbody>
              {hidden.map((h) => (
                <tr key={h.item.key}>
                  <td>{h.item.title}</td>
                  <td>{h.owners.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <ScreenFigures keys={figures} hasSamples />

      <div className="foot">{META("").filter(Boolean).join(" · ")}</div>
    </>
  );
}

function FlowMatrixRow({ role }: { role: RoleCode }) {
  const steps = FLOWS.flatMap((f) => f.steps.filter((s) => s.roles.includes(role)).map((s) => `${f.title}: ${s.title}`));
  return (
    <tr>
      <td>
        <b>{ROLE_LABEL[role]}</b>
      </td>
      <td>
        {steps.length === 0 ? "—" : steps.map((s) => <div key={s}>{s}</div>)}
      </td>
    </tr>
  );
}

function FlowBook() {
  /* หนึ่งภาพต่อหนึ่งสายงาน — หน้าที่สายงานนั้นเริ่มต้น (ใส่ทุกหน้าจะกลายเป็นสมุดภาพ ไม่ใช่คู่มือ) */
  const figures = [...new Set(FLOWS.map((f) => f.steps.find((s) => s.screen)?.screen).filter((s): s is string => Boolean(s)))];
  const roles = Object.keys(ROLE_LABEL) as RoleCode[];

  return (
    <>
      <Cover
        title="คู่มือผังกระบวนการ"
        role="ทุกบทบาท"
        why={FLOW_BOOK.why}
        contents={[`${FLOWS.length} สายงานหลัก`, "ระบบทำอะไรให้เอง", "ขั้นที่มักหลุด", "ใครทำอะไร"]}
        meta={META("ใช้สอนคนใหม่ · ใช้หาว่างานค้างที่ใคร")}
      />

      {FLOWS.map((f, i) => (
        <div key={f.key}>
          <h2>
            {i + 1} · {f.title}
          </h2>
          <p className="lead">{f.description}</p>
          {f.steps.map((s, j) => (
            <div className="step" key={s.title}>
              <div className="n">{j + 1}</div>
              <div className="t">{s.title}</div>
              <div className="w">
                <RoleChips roles={s.roles} />
                {s.screen ? ` ที่หน้า ${screenTitle(s.screen)}` : ""}
              </div>
              {s.note ? <div>{s.note}</div> : null}
            </div>
          ))}
        </div>
      ))}

      <h2>{FLOWS.length + 1} · ระบบทำอะไรให้เอง</h2>
      <p className="lead">ขั้นเหล่านี้ไม่ต้องกรอกซ้ำด้วยมือ ถ้ายังทำเองอยู่แปลว่ากำลังทำงานสองรอบ</p>
      {FLOW_BOOK.automatic.map((a) => (
        <div className="note" key={a}>
          {a}
        </div>
      ))}

      <h2>{FLOWS.length + 2} · ขั้นที่มักหลุดถ้าไม่มีคนตาม</h2>
      {FLOW_BOOK.risky.map((r) => (
        <div className="warn" key={r}>
          {r}
        </div>
      ))}

      <h2>{FLOWS.length + 3} · ใครทำอะไร</h2>
      <p className="lead">อ่านจากผังจริงในระบบ — ถ้ามีชื่อคุณอยู่หลายสายงาน แปลว่างานนั้นรอคุณอยู่หลายจุด</p>
      <table>
        <thead>
          <tr>
            <th style={{ width: "18%" }}>บทบาท</th>
            <th>ขั้นที่รับผิดชอบ</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <FlowMatrixRow role={r} key={r} />
          ))}
        </tbody>
      </table>

      <ScreenFigures keys={figures} hasSamples={false} />

      <div className="foot">{META("").filter(Boolean).join(" · ")}</div>
    </>
  );
}

export function ManualBookView({ bookKey }: { bookKey: string }) {
  if (!manualBook(bookKey)) {
    return <p>ไม่พบคู่มือเล่มนี้</p>;
  }
  return <div className="sheet">{isManualRole(bookKey) ? <RoleBook role={bookKey} /> : <FlowBook />}</div>;
}
