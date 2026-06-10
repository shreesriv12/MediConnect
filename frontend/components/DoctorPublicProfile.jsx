import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Award, Calendar, Mail, Phone, Stethoscope, User } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DoctorPublicProfile = () => {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/doctor/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load doctor profile");
        }

        setDoctor(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <p className="text-slate-600">Loading doctor profile...</p>
      </main>
    );
  }

  if (error || !doctor) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center">
          <p className="text-red-600">{error || "Doctor profile not found"}</p>
          <Link to="/finddoctors" className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-2 text-white">
            Browse doctors
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Link to="/finddoctors" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Back to doctors
          </Link>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <img
              src={doctor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=2563eb&color=fff&size=160`}
              alt={doctor.name}
              className="h-36 w-36 rounded-full object-cover border border-slate-200 shadow-sm"
            />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Dr. {doctor.name}</h1>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                <Stethoscope size={16} />
                {doctor.specialization}
              </p>
              <p className="mt-4 text-slate-600">
                Verified medical professional available for appointments through MediConnect.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <Award className="text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Experience</p>
            <p className="text-xl font-semibold text-slate-900">{doctor.experience} years</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <Calendar className="text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Age</p>
            <p className="text-xl font-semibold text-slate-900">{doctor.age} years</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <User className="text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Gender</p>
            <p className="text-xl font-semibold text-slate-900">{doctor.gender}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900">Qualification</h2>
          <p className="mt-2 text-slate-700">{doctor.degree}</p>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
          <div className="mt-4 grid gap-3 text-slate-700 sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <Mail size={18} />
              {doctor.email}
            </p>
            <p className="flex items-center gap-2">
              <Phone size={18} />
              {doctor.phone}
            </p>
          </div>
        </div>

        <Link
          to="/bookappointment"
          className="mt-6 inline-flex rounded-md bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Book appointment
        </Link>
      </section>
    </main>
  );
};

export default DoctorPublicProfile;
