import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ContactForm from "./ContactForm";
import ContactsCardsContainer from "./ContactsCardsContainer";

export default function PrivatePage() {
  const navigate = useNavigate();

  // Get current user from JWT cookie
  const [currentUser, setCurrentUser] = useState(() => {
    const jwtToken = Cookies.get("jwt-authorization");
    if (!jwtToken) return "";
    try {
      const decoded = jwtDecode(jwtToken);
      return decoded.username || "";
    } catch {
      return "";
    }
  });

  // Verify token on mount
  useEffect(() => {
    const jwtToken = Cookies.get("jwt-authorization");
    if (!jwtToken) {
      navigate("/not-authorized");
      return;
    }

    try {
      jwtDecode(jwtToken); 
    } catch {
      navigate("/not-authorized");
    }
  }, [navigate]);

  // Contacts state
  const [contacts, setContacts] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    image: "",
  });
  const [postResponse, setPostResponse] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const perPage = 5;

  // Load contacts whenever postResponse changes
  useEffect(() => {
    loadContacts();
  }, [postResponse]);

  const loadContacts = async () => {
    try {
      const response = await axios.get("http://localhost:3000/contacts");
      setContacts(response.data);
    } catch (error) {
      console.log(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      image: "",
    });
  };

  const handleOnChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleOnSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await axios.patch(`http://localhost:3000/contacts/${formData._id}`, formData);
        setPostResponse({ message: "Contact updated" });
        setIsEditing(false);
      } else {
        const response = await axios.post("http://localhost:3000/contacts", formData);
        setPostResponse(response.data);
      }
      resetForm();
    } catch (error) {
      console.log(error.message);
    }
  };

  const handleOnDelete = async (id) => {
    try {
      const response = await axios.delete(`http://localhost:3000/contacts/${id}`);
      setPostResponse(response.data);
    } catch (error) {
      console.log(error.message);
    }
  };

  const handleOnEdit = async (id) => {
    try {
      const response = await axios.get(`http://localhost:3000/contacts/${id}`);
      const data = response.data;

      setFormData({
  name: data.name,
  email: data.email || "",
  phone: data.phone || "",
  address: data.address || "",
  image: data.image || "",
  _id: data._id,
});


      setIsEditing(true);
    } catch (error) {
      console.log(error.message);
    }
  };

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(contacts.length / perPage));
  const start = page * perPage;
  const end = start + perPage;
  const contactsToDisplay = contacts.slice(start, end);

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  const handleLogout = () => {
    Cookies.remove("jwt-authorization");
    setCurrentUser("");
    navigate("/login");
  };

  return (
    <div className="page">
      <h1>Welcome {currentUser}</h1>
      <button onClick={handleLogout}>Logout</button>

      <ContactForm
        name={formData.name}
        email={formData.email}
        phone={formData.phone}
        address={formData.address}
        image={formData.image}
        handleOnChange={handleOnChange}
        handleOnSubmit={handleOnSubmit}
        isEditing={isEditing}
      />

      <p>{postResponse?.message}</p>

      <ContactsCardsContainer
        contacts={contactsToDisplay}
        handleOnDelete={handleOnDelete}
        handleOnEdit={handleOnEdit}
      />

      <div className="pagination">
        <button onClick={handlePrev} disabled={page === 0}>
          Previous
        </button>
        <span>Page {page + 1} of {totalPages}</span>
        <button onClick={handleNext} disabled={page >= totalPages - 1}>
          Next
        </button>
      </div>
    </div>
  );
}
