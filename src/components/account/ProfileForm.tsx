"use client";

import { useActionState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { updateProfileAction } from "@/lib/actions/profile";
import { idleForm } from "@/lib/forms";
import type { PublicUser } from "@/lib/db/schema";

const DISCIPLINES = ["Brand & Identity", "Motion / Film", "Content & Social", "Digital & Web", "Photography", "Creative Direction"];

export function ProfileForm({ user }: { user: PublicUser }) {
  const [state, action] = useActionState(updateProfileAction, idleForm);
  const links = [0, 1, 2].map((i) => user.links[i] ?? { label: "", url: "" });

  return (
    <form action={action} className="stack g-4">
      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {state.status === "success" && state.message ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label="First name" name="firstName" error={state.fields?.firstName}>
          <input id="firstName" name="firstName" className="input" defaultValue={user.firstName} required />
        </Field>
        <Field label="Last name" name="lastName" error={state.fields?.lastName}>
          <input id="lastName" name="lastName" className="input" defaultValue={user.lastName} required />
        </Field>
      </div>

      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label="Role title" name="title" hint="How you'd like to be listed.">
          <input id="title" name="title" className="input" defaultValue={user.title} placeholder="Design Intern" />
        </Field>
        <Field label="Discipline" name="discipline">
          <select id="discipline" name="discipline" className="select" defaultValue={user.discipline}>
            <option value="">Not set</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Where you work" name="location" hint="Studio days, remote, or both.">
        <input id="location" name="location" className="input" defaultValue={user.location} placeholder="Studio · Tue–Thu" />
      </Field>

      <Field label="Short bio" name="bio" error={state.fields?.bio} hint="A line or two. It shows in the directory.">
        <textarea id="bio" name="bio" className="textarea" rows={3} defaultValue={user.bio} maxLength={600} />
      </Field>

      <div className="stack g-3">
        <span className="label">Links</span>
        {links.map((link, i) => (
          <div key={i} className="row g-2 wrap">
            <input
              name={`linkLabel${i}`}
              className="input"
              placeholder="Portfolio"
              defaultValue={link.label}
              style={{ flex: "0 1 150px", minWidth: 120 }}
            />
            <input
              name={`linkUrl${i}`}
              type="url"
              className="input grow"
              placeholder="https://…"
              defaultValue={link.url}
              style={{ minWidth: 180 }}
            />
          </div>
        ))}
        {state.fields?.linkUrl0 ? <span className="error-text">{state.fields.linkUrl0}</span> : null}
      </div>

      <div className="row">
        <Submit className="btn btn-primary" pendingLabel="Saving…">
          Save profile
        </Submit>
      </div>
    </form>
  );
}
