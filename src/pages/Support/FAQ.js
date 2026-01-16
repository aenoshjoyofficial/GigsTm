
import { Container, Typography, Accordion, AccordionSummary, AccordionDetails, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const FAQ = () => {
  const faqs = [
    {
      question: "What is GigsTM?",
      answer: "GigsTM is a gig-based marketplace where workers can find and complete tasks for clients and earn rewards."
    },
    {
      question: "How do I sign up as a worker?",
      answer: "You can sign up by clicking the 'Sign Up' link on the login page. You'll need to provide your name, email, and create a password."
    },
    {
      question: "How do I get paid?",
      answer: "Once you complete a gig step and it's verified by a manager, the payment is credited to your virtual wallet. You can then request a withdrawal."
    },
    {
      question: "What is KYC and why is it required?",
      answer: "KYC (Know Your Customer) is a verification process required for legal and security reasons. You'll need to upload identity documents to verify your account before you can withdraw funds."
    },
    {
      question: "What if I have a dispute with a gig?",
      answer: "If your claim is rejected and you disagree, you can raise a dispute through the 'Disputes' section in your dashboard."
    }
  ];

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Frequently Asked Questions
      </Typography>
      <Box sx={{ mt: 4 }}>
        {faqs.map((faq, index) => (
          <Accordion key={index}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel${index}-content`}
              id={`panel${index}-header`}
            >
              <Typography fontWeight="bold">{faq.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Container>
  );
};

export default FAQ;
