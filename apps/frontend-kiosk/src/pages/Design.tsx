import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Box, CircuitBoard } from 'lucide-react'

const builders = [
  {
    title: 'Box Builder',
    description: 'Parametric snap-fit box with lid',
    icon: Box,
    href: '/design/box',
  },
  {
    title: 'PCB Standoff Plate',
    description: 'Mounting plate with standoffs at custom hole positions',
    icon: CircuitBoard,
    href: '/design/pcb-standoff',
  },
]

export default function Design() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Design</h1>
        <p className="text-muted-foreground mb-8">Choose a builder to create a printable model.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {builders.map(({ title, description, icon: Icon, href }) => (
            <Card
              key={href}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
              onClick={() => navigate(href)}
            >
              <CardContent className="p-6 flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">{title}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
