const Appointment = require('../Model/appointment');
const User = require("../Model/user");
const nodemailer = require("nodemailer");



exports.recherche = async (req, res) => {
  try {
    const { dateOnly, professionalId } = req.body;

    if (!dateOnly || !professionalId) {
      return res.status(400).json({ message: "Date et ID du professionnel requis" });
    }

    const appointments = await Appointment.find({
      dateOnly,
      professional: professionalId,
      status: { $ne: "cancelled" }
    })

    res.status(200).json({ message: "recherche avec succès", appointment: appointments });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.reservations = async (req, res) => {
  try {
    const { client, professional, dateOnly, heureDebut, heureFin } = req.body;
    const clientExists = await User.findById(client);
    if (!clientExists || clientExists.role != "client") {
      return res.status(404).json({ message: "Client  introuvable" });
    }
    const professionalExists = await User.findById(professional);
    if (!professionalExists || professionalExists.role != "professional") {
      return res.status(404).json({ message: "Professionnel introuvable" });
    }

    const existingAppointment = await Appointment.findOne({
      professional,
      dateOnly,
      status: { $ne: "cancelled" }, // Exclure les rendez-vous annulés
      $or: [
        {
          heureDebut: { $lt: heureFin },
          heureFin: { $gt: heureDebut }
        }
      ]
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "Créneau indisponible, veuillez choisir une autre heure." });
    }

    const newAppointment = new Appointment({
      client,
      professional,
      dateOnly,
      heureDebut,
      heureFin,
      status: "pending"
    });

    const new_reservations = await newAppointment.save();
    console.log("new_reservations",new_reservations)

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // 🔹 Serveur SMTP de Gmail
      port: 465,
      auth: {
        user: 'imscapital26@gmail.com',
        pass: 'krpuuydnvrkxkhkp'
      },
      tls: {
        rejectUnauthorized: false, // Ignore les erreurs liées aux certificats
      },
    });
    let confirmToken ="profession"
    const confirmLink = `http://localhost:4600/api/appointment/confirm/${new_reservations._id}?token=${confirmToken}`;
    const annulerLink = `http://localhost:4600/api/appointment/cancelled/${new_reservations._id}?token=${confirmToken}`;
    const mailOptions = {
      from: "imscapital26@gmail.com",
      to: "fakh25adem@gmail.com", // Envoi à l'e-mail du client
      subject: "Confirmation de votre réservation",
      html: `
        <h3>Bonjour ${professionalExists.nom},</h3>
        <p>Un rendez-vous avec <strong>${clientExists.nom}</strong> a été enregistré.</p>
        <p><strong>Date :</strong> ${dateOnly}</p>
        <p><strong>Heure :</strong> ${heureDebut} - ${heureFin}</p>
        <p>Veuillez confirmer votre disponibilité en cliquant sur le bouton ci-dessous :</p>
        <a href="${confirmLink}" style="display: inline-block; background-color: #28a745; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
          Confirmer le rendez-vous
        </a>
         <a href="${annulerLink}" style="display: inline-block; background-color:rgb(180, 37, 37); color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
          Annuler le rendez-vous
        </a>
        <p>Merci de votre confiance.</p>
      `,
    };

    // Envoi de l'e-mail
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Erreur lors de l'envoi de l'email :", error);
      } else {
        console.log("E-mail envoyé :", info.response);
      }
    });
    res.status(201).json({ message: "Rendez-vous enregistré avec succès", appointment: newAppointment , nom:clientExists.nom });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
exports.confirm = async (req, res) => {
  try {
    const { id } = req.params;

    const { token } = req.query;

    // Vérifier le token
    if(!token || token !="profession"){
      return res.send("<h2>Invalid credentials ❌</h2>");
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).send("Rendez-vous introuvable.");
    }
    appointment.status = "confirmed";
    await appointment.save();
  
    res.send("<h2>Rendez-vous confirmé avec succès ! ✅</h2>");
  } catch (error) {
    res.status(500).send("Erreur lors de la confirmation.");
  }
};
exports.cancelled = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req?.query;

    // Vérifier le token
    if(!token || token !="profession"){
      return res.send("<h2>Invalid credentials ❌</h2>");
    }
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).send("Rendez-vous introuvable.");
    }
    appointment.status = "cancelled";
    await appointment.save();

    res.send("<h2>❌ Rendez-vous annulé avec succès.</h2>");
  } catch (error) {
    res.status(500).send("Erreur lors de l'annulation.");
  }
};
exports.getAppointmentsForCalendar = async (req, res) => {
  try {
    const { professionalId } = req.params;  // Récupérer l'id du professionnel à partir des paramètres de l'URL

    const appointments = await Appointment.find({
      professional: professionalId,
      status: { $ne: "cancelled" }
    })
      .populate('client', 'nom')
      .populate('professional', 'nom');

    // Transformer les rendez-vous pour FullCalendar
    const events = appointments.map(app => ({
      id: app._id,
      title: `Rendez-vous avec ${app?.client?.nom}`,
      start: `${app.dateOnly}T${app.heureDebut}`,
      end: `${app.dateOnly}T${app.heureFin}`,
    }));

    res.status(200).json(events);

  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
};
exports.getAppointmentsCalendarForClient = async (req, res) => {
  try {
    const { clientId } = req.params;  // Récupérer l'id du professionnel à partir des paramètres de l'URL

    const appointments = await Appointment.find({
      client: clientId,
    })
      .populate('client', 'nom')
      .populate('professional', 'nom');

    // Transformer les rendez-vous pour FullCalendar
    const events = appointments.map(app => ({
      id: app._id,
      title: `Rendez-vous avec ${app?.professional?.nom}`,
      start: `${app.dateOnly}T${app.heureDebut}`,
      end: `${app.dateOnly}T${app.heureFin}`,
    }));

    res.status(200).json(events);

  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
};
exports.getAll = async (req, res) => {
  try {

    const appointments = await Appointment.find();
    res.status(200).json(appointments);

  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
};

