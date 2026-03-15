//rabt entre backend et frontend 
// Ce fichier centralise tous les appels API vers le backend FastAPI
// Au lieu d'écrire fetch() partout dans les composants React,
// on regroupe tout ici pour faciliter la maintenance

// Fonction qui envoie les identifiants de l'utilisateur au backend pour se connecter
// data doit contenir : { email: "...", password: "..." }
// Retourne la réponse du serveur en JSON (message, username, role — ou une erreur)
export const loginUser = async (data) => {

  // On envoie une requête POST vers l'endpoint de login du backend
  const response = await fetch("http://127.0.0.1:8000/auth/login", {

    method: "POST",

    headers: {
      "Content-Type": "application/json"   // on indique qu'on envoie du JSON
    },

    // On convertit l'objet JavaScript en chaîne JSON pour l'envoyer
    body: JSON.stringify(data)

  })

  // On convertit la réponse reçue en objet JavaScript et on la retourne
  return response.json()

}