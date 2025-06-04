import fetch from "node-fetch";

export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Send email using Netlify Email Integration
    const response = await fetch(
      `${process.env.URL}/.netlify/functions/emails/booking-confirmation`,
      {
        method: "POST",
        headers: {
          "netlify-emails-secret": process.env.NETLIFY_EMAILS_SECRET,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "bookings@rotorem.bg", // Your verified sender email
          to: "n.ivanov.ivanov@abv.bg",
          subject: `Нова заявка - ${data.name} - ${data.date} ${data.time}`,
          parameters: {
            name: data.name,
            phone: data.phone,
            email: data.email || "Не е посочен",
            date: data.date,
            time: data.time,
            address: data.address,
            appliance: data.appliance,
            details: data.details || ""
          }
        })
      }
    );

    if (response.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Email sent successfully" })
      };
    } else {
      throw new Error("Failed to send email");
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to send email" })
    };
  }
};