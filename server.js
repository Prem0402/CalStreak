import express from 'express'
import { Client } from '@notionhq/client'
import dotenv from 'dotenv'
import cors from 'cors'

dotenv.config()

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const DB_ID  = process.env.NOTION_DATABASE_ID
const app    = express()

app.use(cors())
app.use(express.json())

// ─── Mappers ──────────────────────────────────────────────────────────────────

function notionToDay(props) {
  return {
    workout:    props.Workout?.checkbox       ?? false,
    water:      props.Water?.checkbox         ?? false,
    study:      props.Study?.checkbox         ?? false,
    protein:    props.Protein?.checkbox       ?? false,
    read:       props.Read?.checkbox          ?? false,
    skill:      props.Skill?.checkbox         ?? false,
    read_pages: props['Pages Read']?.number   ?? 0,
    status:     props.Status?.select?.name    ?? null,
    streak:     props['Streak Count']?.number ?? 0,
  }
}

const STATUS_LABEL = {
  complete:   'Complete',
  compromise: 'Compromise',
  missed:     'Missed',
  rest:       'Rest Day',
}

function dayToNotion(day, dateKey, streak, status) {
  return {
    Date:           { title: [{ text: { content: dateKey } }] },
    Workout:        { checkbox: !!day.workout  },
    Water:          { checkbox: !!day.water    },
    Study:          { checkbox: !!day.study    },
    Protein:        { checkbox: !!day.protein  },
    Read:           { checkbox: !!day.read     },
    Skill:          { checkbox: !!day.skill    },
    'Pages Read':   { number:   day.read_pages || 0 },
    'Streak Count': { number:   streak || 0 },
    Status:         { select:   { name: STATUS_LABEL[status] || 'Missed' } },
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/history → { "2026-03-08": { workout: bool, ... }, ... }
app.get('/api/history', async (req, res) => {
  try {
    const pages = []
    let cursor
    do {
      const resp = await notion.databases.query({
        database_id: DB_ID,
        start_cursor: cursor,
        page_size: 100,
        sorts: [{ property: 'Date', direction: 'descending' }],
      })
      pages.push(...resp.results)
      cursor = resp.has_more ? resp.next_cursor : undefined
    } while (cursor)

    const history = {}
    for (const page of pages) {
      const dateKey = page.properties.Date?.title?.[0]?.plain_text
      if (dateKey) history[dateKey] = notionToDay(page.properties)
    }
    res.json(history)
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/day → create or update a day's row
app.post('/api/day', async (req, res) => {
  try {
    const { date, day, streak, status } = req.body
    const props = dayToNotion(day, date, streak, status)

    const existing = await notion.databases.query({
      database_id: DB_ID,
      filter: { property: 'Date', title: { equals: date } },
    })

    if (existing.results.length > 0) {
      await notion.pages.update({ page_id: existing.results[0].id, properties: props })
    } else {
      await notion.pages.create({ parent: { database_id: DB_ID }, properties: props })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(3001, () => console.log('✅  API server → http://localhost:3001'))
