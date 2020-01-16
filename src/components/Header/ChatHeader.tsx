import { IonButton, IonButtons, IonIcon, IonTitle, IonToolbar } from '@ionic/react'
import { arrowBack, person } from 'ionicons/icons'
import React from 'react'

interface Props {
  title: string
  handleBackBtn: () => void
  peerID?: string
}

const ChatHeader = ({ title, handleBackBtn, peerID }: Props) => (
  <IonToolbar color="primary">
    <IonButtons slot="start">
      <IonButton onClick={handleBackBtn}>
        <IonIcon icon={arrowBack} />
      </IonButton>
    </IonButtons>
    <IonTitle size="small" className="uk-text-center uk-text-truncate">
      {title}
    </IonTitle>
    <IonButtons slot="end">
      <IonButton disabled={peerID === undefined} routerLink={`/profile/${peerID}`}>
        <IonIcon icon={person} />
      </IonButton>
    </IonButtons>
  </IonToolbar>
)

export default ChatHeader