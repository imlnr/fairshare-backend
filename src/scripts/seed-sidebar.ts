import { connectDatabase } from "@/config/database"
import { seedSidebarMenu } from "@/seeds/sidebar.seed"
import { SidebarMenuItem } from "@/modules/sidebar/sidebar-menu-item.model"

async function main() {
  await connectDatabase()
  await seedSidebarMenu()
  const items = await SidebarMenuItem.find().select("key title section").lean()
  console.log(
    JSON.stringify(
      {
        count: items.length,
        items: items.map((i) => ({ key: i.key, title: i.title, section: i.section })),
      },
      null,
      2
    )
  )
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
