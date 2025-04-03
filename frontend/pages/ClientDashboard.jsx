import React from 'react'
import ChatBot from '../components/ChatBot'
import ClientDashboardNavbar from '../components/ClientDashboardNavbar'

const ClientDashboard = () => {
  return (
    <div>
      <ClientDashboardNavbar/>
      <ChatBot/>
    </div>
  )
}

export default ClientDashboard
